import React, { useMemo, useState } from 'react';
import { BarChart3, FileText, UsersRound } from 'lucide-react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import MonthlyReportsWorkspace from './MonthlyReportsWorkspace.jsx';
import PersonnelHub from './PersonnelHub.jsx';
import './BrianTeamPortal.css';
import './MonthlyReportsManager.css';
import './MonthlyReportsTemplate.css';
import './MonthlyReportsWorkspaceModern.css';
import './MonthlyReportsWorkspaceModernV2.css';
import './MonthlyReportsWorkspaceFixes.css';
import './MonthlyReportsGoogleMaterial.css';
import './MonthlyReportsCardRefresh.css';

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
          className={view === 'team' ? 'is-active' : ''}
          onClick={() => setView('team')}
        >
          <UsersRound /> Nhân sự & quản lý tổ
        </button>
      </nav>

      {view === 'mine' && <MonthlyReportsWorkspace currentUser={teacherViewUser} />}
      {view === 'reports' && <MonthlyReportsWorkspace currentUser={currentUser} />}
      {view === 'team' && <PersonnelHub {...props} />}
    </div>
  );
}
