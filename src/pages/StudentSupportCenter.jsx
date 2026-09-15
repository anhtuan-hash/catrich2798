import React, { useEffect, useMemo, useState } from 'react';
import './StudentSupportCenter.css';
import StudentSupportOverview from '../components/studentSupport/StudentSupportOverview.jsx';
import StudentSupportAlertQueue from '../components/studentSupport/StudentSupportAlertQueue.jsx';
import StudentSupportStudentProfile from '../components/studentSupport/StudentSupportStudentProfile.jsx';
import { listSupportAlerts, listSupportCases } from '../studentSupport/studentSupportApi.js';
import { buildStudentSupportHash, parseStudentSupportHash } from '../studentSupport/studentSupportIdentity.js';
import { searchScopedStudents } from '../studentSupport/studentSupportSources.js';
import { summarizeSupportState } from '../studentSupport/studentSupportViewModel.js';

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

export default function StudentSupportCenter({ language = 'vi' }) {
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

      <section className="student-support-search" aria-label={vi ? 'Tìm học sinh' : 'Student search'}>
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
        <StudentSupportOverview summary={summary} language={language} onOpenAlerts={() => openTab('alerts')} onOpenCases={() => openTab('cases')} />
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

      {!loading && !error && ['cases', 'observations', 'rules', 'reports'].includes(activeTab) ? (
        <section className="student-support-state-card">
          <strong>{vi ? 'Khu vực đã đăng ký, đang triển khai theo kế hoạch' : 'Section registered and scheduled for implementation'}</strong>
          <p>{vi ? 'Không có quyết định hoặc dữ liệu học sinh nào được tự động tạo trong giai đoạn này.' : 'No student decision or case is created automatically at this stage.'}</p>
        </section>
      ) : null}
    </main>
  );
}
