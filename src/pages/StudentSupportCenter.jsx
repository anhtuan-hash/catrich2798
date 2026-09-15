import React, { useEffect, useMemo, useRef, useState } from 'react';
import './StudentSupportCenter.css';
import './StudentSupportCenterLive.css';
import StudentSupportOverview from '../components/studentSupport/StudentSupportOverview.jsx';
import StudentSupportAlertQueue from '../components/studentSupport/StudentSupportAlertQueue.jsx';
import StudentSupportStudentProfile from '../components/studentSupport/StudentSupportStudentProfile.jsx';
import StudentSupportObservationForm from '../components/studentSupport/StudentSupportObservationForm.jsx';
import StudentSupportCaseManager from '../components/studentSupport/StudentSupportCaseManager.jsx';
import StudentSupportRulePanel from '../components/studentSupport/StudentSupportRulePanel.jsx';
import StudentSupportRuleSettings from '../components/studentSupport/StudentSupportRuleSettings.jsx';
import StudentSupportReports from '../components/studentSupport/StudentSupportReports.jsx';
import { listSupportAlerts, listSupportCases } from '../studentSupport/studentSupportApi.js';
import { buildStudentSupportHash, parseStudentSupportHash } from '../studentSupport/studentSupportIdentity.js';
import { searchScopedStudents } from '../studentSupport/studentSupportSources.js';
import { summarizeSupportState } from '../studentSupport/studentSupportViewModel.js';
import {
  emitStudentSupportNotification,
  isAlertReviewOverdue,
  isCaseFollowUpDue,
} from '../studentSupport/studentSupportNotifications.js';

const TABS = [
  ['overview', 'Tổng quan', 'Overview'],
  ['alerts', 'Cảnh báo', 'Alerts'],
  ['student', 'Hồ sơ học sinh', 'Student 360'],
  ['cases', 'Hồ sơ hỗ trợ', 'Cases'],
  ['observations', 'Ghi nhận giáo viên', 'Observations'],
  ['rules', 'Quy tắc', 'Rules'],
  ['reports', 'Báo cáo', 'Reports'],
];

function isMissingDatabaseError(error) {
  return /does not exist|schema cache|could not find|PGRST202|42P01|bes_search_student_support_students/i.test(String(error?.message || error || ''));
}

export default function StudentSupportCenter({ language = 'vi', currentUser = null }) {
  const vi = language === 'vi';
  const [routeState, setRouteState] = useState(() => parseStudentSupportHash(window.location.hash));
  const [alerts, setAlerts] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [databasePending, setDatabasePending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [starterStudents, setStarterStudents] = useState([]);
  const [starterStudentsLoading, setStarterStudentsLoading] = useState(false);
  const [starterStudentsError, setStarterStudentsError] = useState('');
  const reminderKeysRef = useRef(new Set());

  const activeTab = TABS.some(([key]) => key === routeState.tab) ? routeState.tab : 'overview';
  const summary = useMemo(() => summarizeSupportState(alerts, cases), [alerts, cases]);

  useEffect(() => {
    const onHash = () => setRouteState(parseStudentSupportHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    Promise.all([listSupportAlerts(), listSupportCases()])
      .then(([nextAlerts, nextCases]) => {
        if (!alive) return;
        setAlerts(nextAlerts);
        setCases(nextCases);
        setDatabasePending(false);
      })
      .catch((nextError) => {
        if (!alive) return;
        if (isMissingDatabaseError(nextError)) {
          setDatabasePending(true);
          setAlerts([]);
          setCases([]);
        } else {
          setError(nextError?.message || (vi ? 'Không thể tải dữ liệu.' : 'Unable to load data.'));
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [vi]);

  useEffect(() => {
    if (loading || databasePending) return undefined;
    let alive = true;
    setStarterStudentsLoading(true);
    setStarterStudentsError('');
    searchScopedStudents('', 12)
      .then((rows) => {
        if (!alive) return;
        setStarterStudents(rows);
      })
      .catch((nextError) => {
        if (!alive) return;
        setStarterStudents([]);
        setStarterStudentsError(nextError?.message || (vi ? 'Không thể tải danh sách học sinh.' : 'Unable to load student roster.'));
      })
      .finally(() => { if (alive) setStarterStudentsLoading(false); });
    return () => { alive = false; };
  }, [databasePending, loading, vi]);

  useEffect(() => {
    if (loading || databasePending) return;
    const now = new Date();
    cases.filter((row) => isCaseFollowUpDue(row, now)).forEach((row) => {
      const key = `case:${row.id}`;
      if (reminderKeysRef.current.has(key)) return;
      reminderKeysRef.current.add(key);
      emitStudentSupportNotification({
        type: 'CASE_FOLLOW_UP_DUE',
        target: buildStudentSupportHash({ studentRef: row.student_ref, workspaceId: row.homeroom_workspace_id, tab: 'cases' }),
        studentRef: row.student_ref,
      });
    });
    alerts.filter((row) => isAlertReviewOverdue(row, now, 48)).forEach((row) => {
      const key = `alert:${row.id}`;
      if (reminderKeysRef.current.has(key)) return;
      reminderKeysRef.current.add(key);
      emitStudentSupportNotification({
        type: 'ALERT_REVIEW_OVERDUE',
        target: buildStudentSupportHash({ studentRef: row.student_ref, workspaceId: row.homeroom_workspace_id, tab: 'alerts' }),
        studentRef: row.student_ref,
      });
    });
  }, [alerts, cases, databasePending, loading]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError('');
      setSearching(false);
      return undefined;
    }
    let alive = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError('');
      searchScopedStudents(query, 30)
        .then((rows) => { if (alive) setSearchResults(rows); })
        .catch((nextError) => {
          if (!alive) return;
          setSearchResults([]);
          setSearchError(isMissingDatabaseError(nextError)
            ? (vi ? 'Tìm kiếm sẽ hoạt động sau khi database Student Support được kích hoạt.' : 'Search will activate after the Student Support database migration.')
            : (nextError?.message || (vi ? 'Không thể tìm học sinh.' : 'Unable to search students.')));
        })
        .finally(() => { if (alive) setSearching(false); });
    }, 280);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [searchQuery, vi]);

  function openTab(tab) {
    const next = buildStudentSupportHash({
      studentRef: routeState.studentRef,
      workspaceId: routeState.workspaceId,
      tab,
    });
    window.location.hash = next.replace(/^#/, '');
  }

  function openStudent(row) {
    const studentRef = row.student_ref || row.studentRef || row.code || '';
    const workspaceId = row.workspace_id || row.homeroom_workspace_id || row.workspaceId || '';
    window.location.hash = buildStudentSupportHash({ studentRef, workspaceId, tab: 'student' }).replace(/^#/, '');
    setSearchQuery('');
    setSearchResults([]);
  }

  function addCase(row) {
    setCases((items) => [row, ...items.filter((item) => item.id !== row.id)]);
  }

  function updateCase(row) {
    setCases((items) => items.map((item) => item.id === row.id ? row : item));
  }

  function addAlert(row) {
    setAlerts((items) => [row, ...items.filter((item) => item.id !== row.id)]);
  }

  return (
    <main className="student-support-center" aria-labelledby="student-support-title">
      <section className="student-support-hero">
        <div>
          <span className="student-support-kicker">Student Support Center</span>
          <h1 id="student-support-title">{vi ? 'Trung tâm Hỗ trợ Học sinh' : 'Student Support Center'}</h1>
          <p>
            {vi
              ? 'Tổng hợp dữ liệu thực tế, cảnh báo theo quy tắc và quy trình hỗ trợ do giáo viên quyết định.'
              : 'Review factual school data, deterministic alerts and teacher-controlled support workflows.'}
          </p>
        </div>
        <span className="student-support-no-ai">{vi ? 'Không AI' : 'No AI'}</span>
      </section>

      <section className="student-support-search" aria-label={vi ? 'Tìm học sinh' : 'Student search'} data-bes-keep-search="true">
        <label htmlFor="student-support-search-input">{vi ? 'Tìm học sinh trong phạm vi được phép' : 'Search students in your authorized scope'}</label>
        <input
          id="student-support-search-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={vi ? 'Nhập họ tên, mã học sinh hoặc lớp…' : 'Name, student code or class…'}
          autoComplete="off"
        />
        {searching ? <small>{vi ? 'Đang tìm…' : 'Searching…'}</small> : null}
        {searchError ? <small className="is-error">{searchError}</small> : null}
        {searchResults.length ? (
          <div className="student-support-search-results" role="listbox">
            {searchResults.map((row) => (
              <button type="button" key={`${row.student_ref}-${row.workspace_id}`} onClick={() => openStudent(row)}>
                <strong>{row.full_name || row.student_ref}</strong>
                <span>{[row.code, row.class_name, row.school_year].filter(Boolean).join(' · ')}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <nav className="student-support-tabs" aria-label={vi ? 'Khu vực Student Support' : 'Student Support sections'}>
        {TABS.map(([key, viLabel, enLabel]) => (
          <button type="button" key={key} className={activeTab === key ? 'is-active' : ''} onClick={() => openTab(key)}>
            {vi ? viLabel : enLabel}
          </button>
        ))}
      </nav>

      {databasePending ? (
        <section className="student-support-state-card is-pending" aria-live="polite">
          <strong>{vi ? 'Database Student Support chưa được kích hoạt' : 'Student Support database is not active yet'}</strong>
          <p>{vi ? 'Giao diện và kiểm thử code vẫn hoạt động; dữ liệu thật sẽ chỉ được mở sau bước migration production được duyệt riêng.' : 'The UI and code verification can continue; live data will activate only after a separately approved production migration.'}</p>
        </section>
      ) : null}
      {loading ? <section className="student-support-state-card">{vi ? 'Đang tải dữ liệu…' : 'Loading data…'}</section> : null}
      {error ? <section className="student-support-state-card is-error">{error}</section> : null}

      {!loading && !error && activeTab === 'overview' ? (
        <StudentSupportOverview
          summary={summary}
          students={starterStudents}
          studentsLoading={starterStudentsLoading}
          studentsError={starterStudentsError}
          language={language}
          onOpenStudent={openStudent}
          onOpenAlerts={() => openTab('alerts')}
          onOpenCases={() => openTab('cases')}
        />
      ) : null}

      {!loading && !error && activeTab === 'alerts' ? (
        <StudentSupportAlertQueue alerts={alerts} language={language} onOpenStudent={openStudent} />
      ) : null}

      {!loading && !error && activeTab === 'student' ? (
        <StudentSupportStudentProfile
          studentRef={routeState.studentRef}
          workspaceId={routeState.workspaceId}
          alerts={alerts}
          cases={cases}
          language={language}
        />
      ) : null}

      {!loading && !error && activeTab === 'cases' ? (
        <StudentSupportCaseManager
          cases={cases}
          studentRef={routeState.studentRef}
          workspaceId={routeState.workspaceId}
          currentUser={currentUser}
          databasePending={databasePending}
          language={language}
          onCaseCreated={addCase}
          onCaseUpdated={updateCase}
        />
      ) : null}

      {!loading && !error && activeTab === 'observations' ? (
        <StudentSupportObservationForm
          studentRef={routeState.studentRef}
          workspaceId={routeState.workspaceId}
          currentUser={currentUser}
          databasePending={databasePending}
          language={language}
        />
      ) : null}

      {!loading && !error && activeTab === 'rules' ? <>
        <StudentSupportRulePanel
          studentRef={routeState.studentRef}
          workspaceId={routeState.workspaceId}
          currentUser={currentUser}
          databasePending={databasePending}
          language={language}
          onAlertSaved={addAlert}
        />
        <StudentSupportRuleSettings currentUser={currentUser} databasePending={databasePending} language={language} />
      </> : null}

      {!loading && !error && activeTab === 'reports' ? (
        <StudentSupportReports cases={cases} alerts={alerts} language={language} />
      ) : null}
    </main>
  );
}
