import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarRange, FileText, UsersRound } from 'lucide-react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import MonthlyReportsWorkspace from './MonthlyReportsWorkspace.jsx';
import MonthlyReportsHistory from './MonthlyReportsHistory.jsx';
import PersonnelHub from './PersonnelHub.jsx';
import './BrianTeamPortal.css';

export default function BrianTeamPortal(props) {
  const { currentUser } = props;
  const isLeader = isDepartmentLeaderRole(currentUser?.role);
  const [view, setView] = useState('mine');

  const teacherViewUser = useMemo(() => {
    if (!isLeader) return currentUser;
    // TTCM vẫn là giáo viên. Ở tab “Báo cáo của tôi”, chỉ hạ vai trò hiển thị
    // để MonthlyReportsWorkspace mở form cá nhân; id và toàn bộ hồ sơ tài khoản giữ nguyên.
    return { ...currentUser, role: 'teacher' };
  }, [currentUser, isLeader]);

  if (!isLeader) {
    return <div className="btp-shell"><MonthlyReportsWorkspace currentUser={currentUser} /></div>;
  }

  return (
    <div className="btp-shell">
      <nav className="btp-switcher btp-switcher--leader" aria-label="Brian Team">
        <button
          type="button"
          className={view === 'mine' ? 'is-active' : ''}
          onClick={() => setView('mine')}
        >
          <FileText /> Báo cáo của tôi
        </button>
        <button
          type="button"
          className={view === 'reports' ? 'is-active' : ''}
          onClick={() => setView('reports')}
        >
          <BarChart3 /> Tổng hợp tổ
        </button>
        <button
          type="button"
          className={view === 'history' ? 'is-active' : ''}
          onClick={() => setView('history')}
        >
          <CalendarRange /> Thống kê tháng
        </button>
        <button
          type="button"
          className={view === 'team' ? 'is-active' : ''}
          onClick={() => setView('team')}
        >
          <UsersRound /> Nhân sự & quản lý tổ
        </button>
      </nav>

      {view === 'mine' && <MonthlyReportsWorkspace currentUser={teacherViewUser} />}
      {view === 'reports' && <MonthlyReportsWorkspace currentUser={currentUser} />}
      {view === 'history' && <MonthlyReportsHistory currentUser={currentUser} />}
      {view === 'team' && <PersonnelHub {...props} />}
    </div>
  );
}
