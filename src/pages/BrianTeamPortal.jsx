import React, { useState } from 'react';
import { FileText, UsersRound } from 'lucide-react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import MonthlyReportsWorkspace from './MonthlyReportsWorkspace.jsx';
import PersonnelHub from './PersonnelHub.jsx';
import './BrianTeamPortal.css';
import './MonthlyReportsManager.css';
import './MonthlyReportsTemplate.css';

export default function BrianTeamPortal(props) {
  const { currentUser } = props;
  const isLeader = isDepartmentLeaderRole(currentUser?.role);
  const [view, setView] = useState('reports');

  if (!isLeader) return <MonthlyReportsWorkspace currentUser={currentUser} />;

  return (
    <div className="btp-shell">
      <nav className="btp-switcher" aria-label="Brian Team">
        <button type="button" className={view === 'reports' ? 'is-active' : ''} onClick={() => setView('reports')}><FileText /> Báo cáo tháng</button>
        <button type="button" className={view === 'team' ? 'is-active' : ''} onClick={() => setView('team')}><UsersRound /> Nhân sự & quản lý tổ</button>
      </nav>
      {view === 'reports'
        ? <MonthlyReportsWorkspace currentUser={currentUser} />
        : <PersonnelHub {...props} />}
    </div>
  );
}
