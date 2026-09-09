import React, { Fragment, useMemo } from 'react';
import { isExtraClassScheduledOnDate, roomForExtraClass } from '../../utils/extraClassSchedule2026.js';
import {
  attendanceFloorForRoom,
  matchesAttendanceRoomFilter,
  sortAttendanceRoomLabels,
  sortAttendanceRowsByRoomRoute,
} from '../../utils/attendanceDailyRoomFilter.js';
import { extraClassTypeLabel } from '../../utils/extraClassAttendance.js';
import './AttendanceDailyOverview.css';

function statusForSession(session) {
  if (session?.session_status === 'cancelled') return 'cancelled';
  if (session?.session_status === 'completed') return 'completed';
  return 'missing';
}

function statusLabel(status) {
  if (status === 'completed') return 'Đã điểm danh';
  if (status === 'cancelled') return 'Đã hủy';
  return 'Chưa điểm danh';
}

function displayedRoomForClass(classRow, session) {
  return String(session?.teaching_room || roomForExtraClass(classRow) || classRow?.room || '').trim();
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
  const sessionsByClass = useMemo(() => latestSessionsByClass(sessions), [sessions]);
  const scheduledClasses = useMemo(
    () => classes.filter((classRow) => classRow.active !== false && isExtraClassScheduledOnDate(classRow, date)),
    [classes, date],
  );
  const roomOptions = useMemo(() => sortAttendanceRoomLabels(scheduledClasses.map((classRow) => (
    displayedRoomForClass(classRow, sessionsByClass.get(String(classRow.id)))
  ))), [scheduledClasses, sessionsByClass]);
  const effectiveRoomFilter = roomFilter === 'all' || roomOptions.some((room) => matchesAttendanceRoomFilter(room, roomFilter))
    ? roomFilter
    : 'all';
  const visibleClasses = useMemo(() => sortAttendanceRowsByRoomRoute(
    scheduledClasses.filter((classRow) => matchesAttendanceRoomFilter(
      displayedRoomForClass(classRow, sessionsByClass.get(String(classRow.id))),
      effectiveRoomFilter,
    )),
    (classRow) => displayedRoomForClass(classRow, sessionsByClass.get(String(classRow.id))),
  ), [scheduledClasses, sessionsByClass, effectiveRoomFilter]);

  const completedCount = visibleClasses.filter((classRow) => statusForSession(sessionsByClass.get(String(classRow.id))) === 'completed').length;
  const cancelledCount = visibleClasses.filter((classRow) => statusForSession(sessionsByClass.get(String(classRow.id))) === 'cancelled').length;
  const missingCount = Math.max(0, visibleClasses.length - completedCount - cancelledCount);
  const floorCounts = useMemo(() => {
    const counts = new Map();
    visibleClasses.forEach((classRow) => {
      const session = sessionsByClass.get(String(classRow.id));
      const floor = attendanceFloorForRoom(displayedRoomForClass(classRow, session));
      if (floor) counts.set(floor, (counts.get(floor) || 0) + 1);
    });
    return counts;
  }, [visibleClasses, sessionsByClass]);

  let previousFloor = null;

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
        <label className="attendance-calendar-mode-bar__date">
          <span className="sr-only">Ngày điểm danh</span>
          <input
            type="date"
            aria-label="Ngày điểm danh"
            max={maxDate || undefined}
            value={date || ''}
            onChange={(event) => onDateChange?.(event.target.value)}
          />
        </label>
      </div>

      <div className="attendance-daily-overview" aria-live="polite">
        <div className="attendance-daily-overview__summary is-compact" aria-label="Tóm tắt điểm danh">
          <article className="attendance-daily-overview__metric"><span>Có lịch</span><b>{visibleClasses.length}</b></article>
          <article className="attendance-daily-overview__metric is-completed"><span>Đã điểm danh</span><b>{completedCount}</b></article>
          <article className="attendance-daily-overview__metric is-missing"><span>Chưa điểm danh</span><b>{missingCount}</b></article>
          <article className="attendance-daily-overview__metric is-cancelled"><span>Đã hủy</span><b>{cancelledCount}</b></article>
        </div>

        <div className="attendance-daily-table-header" aria-hidden="true">
          <span className="attendance-daily-table-header__class">LỚP</span>
          <span className="attendance-daily-table-header__teacher">GIÁO VIÊN</span>
          <span className="attendance-daily-table-header__room">PHÒNG</span>
          <span className="attendance-daily-table-header__time">THỜI GIAN</span>
          <span className="attendance-daily-table-header__status">TRẠNG THÁI</span>
        </div>

        {loading ? <div className="attendance-daily-overview__empty">Đang tải lịch điểm danh…</div> : null}
        {!loading && !scheduledClasses.length ? <div className="attendance-daily-overview__empty">Không có lớp nào theo lịch vào ngày đã chọn.</div> : null}
        {!loading && scheduledClasses.length > 0 && !visibleClasses.length ? <div className="attendance-daily-overview__empty">Không có lớp nào ở phòng {effectiveRoomFilter} trong ngày đã chọn.</div> : null}

        {!loading && visibleClasses.length > 0 ? (
          <div className="attendance-daily-overview__list">
            {visibleClasses.map((classRow) => {
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
              const showFloorSeparator = effectiveRoomFilter === 'all' && floor && floor !== previousFloor;
              if (floor) previousFloor = floor;

              return (
                <Fragment key={classRow.id}>
                  {showFloorSeparator ? (
                    <div className="attendance-daily-floor-group" data-floor={floor}>
                      <strong>Lầu {floor}<span> · {floorCounts.get(floor) || 0} lớp</span></strong>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className={`attendance-daily-class-row is-${status}`}
                    data-floor={floor || undefined}
                    aria-label={status === 'missing' ? `Điểm danh ${classRow.class_name}` : `Mở ${classRow.class_name} - ${statusLabel(status)}`}
                    onClick={() => onOpenClass?.(classRow, session || null)}
                  >
                    <span className="attendance-daily-class-row__class">
                      <b>{classRow.class_name}</b>
                      <small>{extraClassTypeLabel(classRow.class_type)} · {classRow.subject || 'Chưa ghi môn'}</small>
                    </span>
                    <span className="attendance-daily-class-row__teacher" title={teacher}><b>{teacher}</b></span>
                    <span className="attendance-daily-class-row__meta is-room" data-floor={floor || undefined}>
                      <b>{room}</b>
                    </span>
                    <span className="attendance-daily-class-row__meta is-time">
                      <b>{timeRange}</b>{attendanceMeta ? <small>{attendanceMeta}</small> : null}
                    </span>
                    <span className={`attendance-daily-class-row__status is-${status}`}>
                      <span className="attendance-daily-class-row__status-label">{statusLabel(status)}</span>
                      {status === 'missing' ? <em className="attendance-daily-class-row__action">Điểm danh →</em> : null}
                    </span>
                  </button>
                </Fragment>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
