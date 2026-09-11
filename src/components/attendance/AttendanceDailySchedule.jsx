import React, { useEffect, useMemo, useState } from 'react';
import { loadSupplementalAttendanceActivities } from '../../attendance/supplementalLearningApi.js';
import { getRuntimeClient, getRuntimeState, subscribeRuntime } from '../../services/runtime/core.js';
import { canManageSupplementalLearning } from '../../supplementalAccess.js';
import { isExtraClassScheduledOnDate, roomForExtraClass } from '../../utils/extraClassSchedule2026.js';
import {
  attendanceFloorForRoom,
  matchesAttendanceRoomFilter,
  sortAttendanceRoomLabels,
  sortAttendanceRowsByRoomRoute,
} from '../../utils/attendanceDailyRoomFilter.js';
import { extraClassTypeLabel } from '../../utils/extraClassAttendance.js';
import './AttendanceDailyOverview.css';

const SUPPLEMENTAL_CHANGED_EVENT = 'bes-supplemental-attendance-changed';
const SUPPLEMENTAL_OPEN_EVENT = 'bes-open-supplemental-attendance';

function AttendanceDailyIcon({ name, className = '' }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  };
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    x: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
    layers: <><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></>,
    building: <><path d="M4 21V8l8-4 8 4v13" /><path d="M2 21h20M9 21v-5h6v5M8 10h1m6 0h1M8 13h1m6 0h1" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  };
  return <svg {...common}>{paths[name] || paths.list}</svg>;
}

function statusForSession(session) {
  if (session?.session_status === 'cancelled') return 'cancelled';
  if (session?.session_status === 'completed') return 'completed';
  return 'missing';
}

function statusForSupplementalActivity(activity) {
  const status = String(activity?.status || '').toLowerCase();
  if (status === 'cancelled') return 'cancelled';
  if (status === 'confirmed') return 'completed';
  return 'missing';
}

function statusLabel(status) {
  if (status === 'completed') return 'Đã điểm danh';
  if (status === 'cancelled') return 'Đã hủy';
  return 'Chưa điểm danh';
}

function supplementalStatusLabel(activity) {
  const status = String(activity?.status || '').toLowerCase();
  if (status === 'confirmed') return 'Đã điểm danh';
  if (status === 'cancelled') return 'Đã hủy';
  if (status === 'in_progress') return 'Đang điểm danh';
  return 'Chưa điểm danh';
}

function displayedRoomForClass(classRow, session) {
  return String(session?.teaching_room || roomForExtraClass(classRow) || classRow?.room || '').trim();
}

function displayedRoomForSupplemental(activity) {
  return String(activity?.room || '').trim();
}

function latestSessionsByClass(sessions) {
  const map = new Map();
  (sessions || []).forEach((session) => {
    const key = String(session.class_id);
    const current = map.get(key);
    if (!current || String(session.checked_at || '') >= String(current.checked_at || '')) map.set(key, session);
  });
  return map;
}

export default function AttendanceDailySchedule({
  classes = [],
  sessions = [],
  date,
  maxDate,
  loading = false,
  roomFilter = 'all',
  onDateChange,
  onRoomFilterChange,
  onOpenClass,
  teacherLabelForClass,
}) {
  const [supplementalActivities, setSupplementalActivities] = useState([]);
  const [supplementalLoading, setSupplementalLoading] = useState(false);
  const sessionsByClass = useMemo(() => latestSessionsByClass(sessions), [sessions]);

  useEffect(() => {
    let disposed = false;
    let requestToken = 0;

    const loadSupplemental = async () => {
      const client = getRuntimeClient();
      const runtime = getRuntimeState();
      const selectedDate = String(date || '').slice(0, 10);
      if (!client || !selectedDate || !canManageSupplementalLearning(runtime)) {
        if (!disposed) {
          setSupplementalActivities([]);
          setSupplementalLoading(false);
        }
        return;
      }
      const token = ++requestToken;
      setSupplementalLoading(true);
      try {
        const rows = await loadSupplementalAttendanceActivities(client, { from: selectedDate, to: selectedDate });
        const managedRows = (rows || []).filter((activity) => activity.supplementalKind !== 'adhoc');
        if (!disposed && token === requestToken) setSupplementalActivities(managedRows);
      } catch {
        if (!disposed && token === requestToken) setSupplementalActivities([]);
      } finally {
        if (!disposed && token === requestToken) setSupplementalLoading(false);
      }
    };

    const handleSupplementalChanged = () => { void loadSupplemental(); };
    const unsubscribeRuntime = subscribeRuntime(() => { void loadSupplemental(); });
    window.addEventListener(SUPPLEMENTAL_CHANGED_EVENT, handleSupplementalChanged);
    return () => {
      disposed = true;
      requestToken += 1;
      unsubscribeRuntime?.();
      window.removeEventListener(SUPPLEMENTAL_CHANGED_EVENT, handleSupplementalChanged);
    };
  }, [date]);

  const scheduledClasses = useMemo(
    () => classes.filter((classRow) => classRow.active !== false && isExtraClassScheduledOnDate(classRow, date)),
    [classes, date],
  );

  const roomOptions = useMemo(() => sortAttendanceRoomLabels([
    ...scheduledClasses.map((classRow) => displayedRoomForClass(classRow, sessionsByClass.get(String(classRow.id)))),
    ...supplementalActivities.map((activity) => displayedRoomForSupplemental(activity)),
  ]), [scheduledClasses, sessionsByClass, supplementalActivities]);

  const effectiveRoomFilter = roomFilter === 'all' || roomOptions.some((room) => matchesAttendanceRoomFilter(room, roomFilter))
    ? roomFilter
    : 'all';

  const visibleClasses = useMemo(() => scheduledClasses.filter((classRow) => matchesAttendanceRoomFilter(
    displayedRoomForClass(classRow, sessionsByClass.get(String(classRow.id))),
    effectiveRoomFilter,
  )), [scheduledClasses, sessionsByClass, effectiveRoomFilter]);

  const visibleSupplementalActivities = useMemo(() => supplementalActivities.filter((activity) => matchesAttendanceRoomFilter(
    displayedRoomForSupplemental(activity),
    effectiveRoomFilter,
  )), [supplementalActivities, effectiveRoomFilter]);

  const visibleRows = useMemo(() => sortAttendanceRowsByRoomRoute([
    ...visibleClasses.map((classRow) => {
      const session = sessionsByClass.get(String(classRow.id));
      return {
        key: `extra:${classRow.id}`,
        source: 'extra',
        classRow,
        room: displayedRoomForClass(classRow, session),
        status: statusForSession(session),
      };
    }),
    ...visibleSupplementalActivities.map((activity) => ({
      key: `supplemental:${activity.id}`,
      source: 'supplemental',
      activity,
      room: displayedRoomForSupplemental(activity),
      status: statusForSupplementalActivity(activity),
    })),
  ], (row) => row.room), [visibleClasses, visibleSupplementalActivities, sessionsByClass]);

  const completedCount = visibleRows.filter((row) => row.status === 'completed').length;
  const cancelledCount = visibleRows.filter((row) => row.status === 'cancelled').length;
  const missingCount = Math.max(0, visibleRows.length - completedCount - cancelledCount);
  const floorCounts = useMemo(() => {
    const counts = new Map();
    visibleRows.forEach((row) => {
      const floor = attendanceFloorForRoom(row.room);
      if (floor) counts.set(floor, (counts.get(floor) || 0) + 1);
    });
    return counts;
  }, [visibleRows]);
  const activeFloorCount = floorCounts.size;
  const showFloorCards = roomFilter === 'all';
  const floorGroups = useMemo(() => {
    const groups = [];
    const byFloor = new Map();
    visibleRows.forEach((row) => {
      const floor = attendanceFloorForRoom(row.room);
      const key = floor || 'other';
      if (!byFloor.has(key)) {
        const group = { key, floor: floor || null, rows: [] };
        byFloor.set(key, group);
        groups.push(group);
      }
      byFloor.get(key).rows.push(row);
    });
    return groups;
  }, [visibleRows]);

  const renderClassRow = (classRow) => {
    const session = sessionsByClass.get(String(classRow.id));
    const status = statusForSession(session);
    const room = displayedRoomForClass(classRow, session) || 'Chưa ghi phòng';
    const floor = attendanceFloorForRoom(room);
    const timeRange = session?.teaching_time_range || classRow.time_range || 'Chưa ghi giờ';
    const teacher = status === 'completed'
      ? (session?.teacher_name || teacherLabelForClass?.(classRow) || classRow.teacher_name || 'Chưa ghi giáo viên')
      : (teacherLabelForClass?.(classRow) || classRow.teacher_name || 'Chưa phân công GV');
    const attendanceMeta = status === 'completed'
      ? `${Number(session?.present_count || 0)}/${Number(session?.total_students || 0)} có mặt · ${String(session?.lesson_periods || 1).replace('.', ',')} tiết`
      : status === 'cancelled'
        ? `${session?.cancellation_reason || 'Buổi học đã hủy'} · 0 tiết`
        : '';
    const statusIcon = status === 'completed' ? 'check' : status === 'cancelled' ? 'x' : 'clock';

    return (
      <button
        key={classRow.id}
        type="button"
        className={`attendance-daily-class-row is-${status}`}
        data-floor={floor || undefined}
        aria-label={status === 'missing' ? `Điểm danh ${classRow.class_name}` : `Mở ${classRow.class_name} - ${statusLabel(status)}`}
        onClick={() => onOpenClass?.(classRow, session || null)}
      >
        <span className="attendance-daily-class-row__class-shell">
          <span className="attendance-daily-class-row__leading-icon"><AttendanceDailyIcon name="users" /></span>
          <span className="attendance-daily-class-row__class">
            <b>{classRow.class_name}</b>
            <small>{extraClassTypeLabel(classRow.class_type)} · {classRow.subject || 'Chưa ghi môn'}</small>
          </span>
        </span>
        <span className="attendance-daily-class-row__teacher" title={teacher}><b>{teacher}</b></span>
        <span className="attendance-daily-class-row__meta is-room" data-floor={floor || undefined}>
          <span className="attendance-daily-class-row__room-icon"><AttendanceDailyIcon name="building" /></span>
          <b>{room}</b>
        </span>
        <span className="attendance-daily-class-row__meta is-time">
          <span className="attendance-daily-class-row__time-icon"><AttendanceDailyIcon name="clock" /></span>
          <span className="attendance-daily-class-row__time-copy"><b>{timeRange}</b>{attendanceMeta ? <small>{attendanceMeta}</small> : null}</span>
        </span>
        <span className={`attendance-daily-class-row__status is-${status}`}>
          <span className="attendance-daily-class-row__status-icon"><AttendanceDailyIcon name={statusIcon} /></span>
          <span className="attendance-daily-class-row__status-label">{statusLabel(status)}</span>
          {status === 'missing' ? <em className="attendance-daily-class-row__action"><AttendanceDailyIcon name="check" />Điểm danh →</em> : null}
        </span>
      </button>
    );
  };

  const renderSupplementalRow = (activity) => {
    const status = statusForSupplementalActivity(activity);
    const room = displayedRoomForSupplemental(activity) || 'Chưa ghi phòng';
    const floor = attendanceFloorForRoom(room);
    const timeRange = activity?.timeRange || 'Chưa ghi giờ';
    const teacher = activity?.teacherName || 'Chưa phân công GV';
    const activityStatus = String(activity?.status || '').toLowerCase();
    const statusIcon = status === 'completed' ? 'check' : status === 'cancelled' ? 'x' : 'clock';
    const attendanceMeta = `Lớp học bổ sung · ${Number(activity?.participantCount || 0)} học sinh`;

    return (
      <button
        key={`supplemental:${activity.id}`}
        type="button"
        className={`attendance-daily-class-row is-${status} is-supplemental`}
        data-bes-attendance-source="supplemental"
        data-bes-supplemental-session-id={activity.id}
        data-floor={floor || undefined}
        aria-label={`${supplementalStatusLabel(activity)} ${activity.title || activity.subject || 'Học bổ sung'}`}
        onClick={() => window.dispatchEvent(new CustomEvent(SUPPLEMENTAL_OPEN_EVENT, {
          detail: { sessionId: activity.id, status: activity.status },
        }))}
      >
        <span className="attendance-daily-class-row__class-shell">
          <span className="attendance-daily-class-row__leading-icon"><AttendanceDailyIcon name="users" /></span>
          <span className="attendance-daily-class-row__class">
            <b>{activity.title || activity.subject || 'Học bổ sung'}</b>
            <small>Học bổ sung · {activity.subject || 'Chưa ghi môn'}</small>
          </span>
        </span>
        <span className="attendance-daily-class-row__teacher" title={teacher}><b>{teacher}</b></span>
        <span className="attendance-daily-class-row__meta is-room" data-floor={floor || undefined}>
          <span className="attendance-daily-class-row__room-icon"><AttendanceDailyIcon name="building" /></span>
          <b>{room}</b>
        </span>
        <span className="attendance-daily-class-row__meta is-time">
          <span className="attendance-daily-class-row__time-icon"><AttendanceDailyIcon name="clock" /></span>
          <span className="attendance-daily-class-row__time-copy"><b>{timeRange}</b><small>{attendanceMeta}</small></span>
        </span>
        <span className={`attendance-daily-class-row__status is-${status}`}>
          <span className="attendance-daily-class-row__status-icon"><AttendanceDailyIcon name={statusIcon} /></span>
          <span className="attendance-daily-class-row__status-label">{supplementalStatusLabel(activity)}</span>
          {status === 'missing' ? <em className="attendance-daily-class-row__action"><AttendanceDailyIcon name="check" />{activityStatus === 'in_progress' ? 'Tiếp tục →' : 'Điểm danh →'}</em> : null}
        </span>
      </button>
    );
  };

  const combinedLoading = loading || supplementalLoading;
  const scheduledTotal = scheduledClasses.length + supplementalActivities.length;

  return (
    <div className="attendance-daily-overview-host">
      <div className="attendance-daily-compact-toolbar">
        <div className="attendance-calendar-room-filter" aria-label="Lọc theo phòng học">
          <div className="attendance-calendar-room-chips" role="group" aria-label="Phòng học">
            <button
              type="button"
              className={`attendance-calendar-room-chip ${effectiveRoomFilter === 'all' ? 'is-active' : ''}`}
              aria-pressed={effectiveRoomFilter === 'all'}
              onClick={() => onRoomFilterChange?.('all')}
            >
              Tất cả phòng
            </button>
            {roomOptions.map((room) => {
              const floor = attendanceFloorForRoom(room);
              const active = effectiveRoomFilter !== 'all' && matchesAttendanceRoomFilter(room, effectiveRoomFilter);
              return (
                <button
                  key={room}
                  type="button"
                  className={`attendance-calendar-room-chip ${active ? 'is-active' : ''}`}
                  data-floor={floor || undefined}
                  aria-pressed={active}
                  onClick={() => onRoomFilterChange?.(room)}
                >
                  {room}
                </button>
              );
            })}
          </div>
        </div>
        <label className="attendance-daily-date-card">
          <span className="attendance-daily-date-card__icon"><AttendanceDailyIcon name="calendar" /></span>
          <span className="attendance-calendar-mode-bar__date attendance-daily-date-card__body">
            <span className="attendance-daily-date-card__label">Ngày điểm danh</span>
            <input
              type="date"
              aria-label="Ngày điểm danh"
              max={maxDate || undefined}
              value={date || ''}
              onChange={(event) => onDateChange?.(event.target.value)}
            />
          </span>
        </label>
      </div>

      <div className="attendance-daily-overview" aria-live="polite">
        <div className="attendance-daily-overview__summary is-compact" aria-label="Tóm tắt điểm danh">
          <div className="attendance-daily-overview__metrics">
            <article className="attendance-daily-overview__metric">
              <span className="attendance-daily-overview__metric-icon"><AttendanceDailyIcon name="list" /></span>
              <span className="attendance-daily-overview__metric-label">Có lịch</span><b>{visibleRows.length}</b>
            </article>
            <article className="attendance-daily-overview__metric is-completed">
              <span className="attendance-daily-overview__metric-icon"><AttendanceDailyIcon name="check" /></span>
              <span className="attendance-daily-overview__metric-label">Đã điểm danh</span><b>{completedCount}</b>
            </article>
            <article className="attendance-daily-overview__metric is-missing">
              <span className="attendance-daily-overview__metric-icon"><AttendanceDailyIcon name="clock" /></span>
              <span className="attendance-daily-overview__metric-label">Chưa điểm danh</span><b>{missingCount}</b>
            </article>
            <article className="attendance-daily-overview__metric is-cancelled">
              <span className="attendance-daily-overview__metric-icon"><AttendanceDailyIcon name="x" /></span>
              <span className="attendance-daily-overview__metric-label">Đã hủy</span><b>{cancelledCount}</b>
            </article>
          </div>
          <div className="attendance-daily-overview__route-meta"><AttendanceDailyIcon name="layers" />Tổng {visibleRows.length} lớp/buổi trong {activeFloorCount} tầng</div>
        </div>

        <div className="attendance-daily-table-header" aria-hidden="true">
          <span className="attendance-daily-table-header__class">LỚP / HOẠT ĐỘNG</span>
          <span className="attendance-daily-table-header__teacher">GIÁO VIÊN</span>
          <span className="attendance-daily-table-header__room">PHÒNG</span>
          <span className="attendance-daily-table-header__time">THỜI GIAN</span>
          <span className="attendance-daily-table-header__status">TRẠNG THÁI</span>
        </div>

        <div className="attendance-daily-overview__list">
          {combinedLoading ? <div className="attendance-daily-overview__empty">Đang tải lịch điểm danh…</div> : null}
          {!combinedLoading && !scheduledTotal ? <div className="attendance-daily-overview__empty">Không có lớp hoặc buổi Học bổ sung nào theo lịch vào ngày đã chọn.</div> : null}
          {!combinedLoading && scheduledTotal > 0 && !visibleRows.length ? <div className="attendance-daily-overview__empty">Không có lớp hoặc buổi Học bổ sung nào ở phòng {effectiveRoomFilter} trong ngày đã chọn.</div> : null}

          {!combinedLoading && visibleRows.length > 0 ? floorGroups.map((group) => (
            <section
              key={group.key}
              className={`attendance-daily-floor-card ${showFloorCards ? '' : 'is-filtered'}`}
              data-floor={group.floor || undefined}
            >
              <div className="attendance-daily-floor-group" data-floor={group.floor || undefined}>
                <strong className="attendance-daily-floor-card__title">
                  <AttendanceDailyIcon name="building" />
                  {group.floor ? <>Lầu {group.floor}<span> · {group.rows.length} lớp/buổi</span></> : <>Khác<span> · {group.rows.length} lớp/buổi</span></>}
                </strong>
                {group.floor ? <span className="attendance-daily-floor-card__badge">Tầng {group.floor}</span> : null}
              </div>
              <div className="attendance-daily-floor-card__rows">
                {group.rows.map((row) => (row.source === 'supplemental' ? renderSupplementalRow(row.activity) : renderClassRow(row.classRow)))}
              </div>
            </section>
          )) : null}
        </div>
      </div>
    </div>
  );
}