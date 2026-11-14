import React from 'react';
import {BookOpen,ClipboardCheck,Landmark,CalendarDays,Leaf,ArrowRight,ChevronRight} from 'lucide-react';
import EditorialHeading from '../shell/EditorialHeading.jsx';
import MetricStrip from '../shell/MetricStrip.jsx';
import ActionTile from '../shell/ActionTile.jsx';
import GroupCard from '../shell/GroupCard.jsx';
import ContentPanel from '../shell/ContentPanel.jsx';
import {progressOfGroup} from '../../v3/museumData.js';
import {englishSystemGroupLabel} from '../../v3/museumApi.js';

const tr = (lang, vi, en) => lang === 'en' ? en : vi;
const SUBMITTED_STATES = ['submitted','ttcm_review','approved_locked','published'];

// OverviewScreen — 01. Full Swiss layout. All counts computed from real
// dashboard records (staff payload); nothing hard-coded.
// Props: {language, data, staff, onNavigate, onCreate, onRefresh}.
export default function OverviewScreen({language='en', data, staff, onNavigate, onCreate}) {
  const payload = data || staff || {};
  const groups = payload.groups || [];
  const assignments = payload.assignments || [];
  const exitTickets = payload.exitTickets || [];
  const primary = assignments[0];
  const linked = primary ? groups.filter(g => g.assignment_id === primary.id) : groups;
  const total = linked.length || groups.length || 0;
  const submittedCount = linked.filter(g => SUBMITTED_STATES.includes(g.state)).length;
  const exitCount = linked.filter(g => exitTickets.some(t => t.group_id === g.id)).length;
  const pct = total ? Math.round(submittedCount / total * 100) : 0;

  const metrics = [
    {value: String(total), label: tr(language, 'Số nhóm lớp', 'Class groups')},
    {value: exitCount + '/' + total, label: 'Exit Tickets'},
    {value: submittedCount + '/' + total, label: tr(language, 'Sản phẩm bảo tàng', 'Museum projects')},
    {value: pct + '%', label: tr(language, 'Dự án hoàn thành', 'Projects shown as complete'), highlight: true},
  ];

  const shortcuts = [
    {icon: BookOpen, title: tr(language,'Tạo bài học','Create a lesson'), description: tr(language,'Bài học Unit 5, nhóm và truy cập QR','Unit 5 lesson, groups and QR access'), variant:'accent', onClick: onCreate},
    {icon: ClipboardCheck, title: tr(language,'Xem bài nộp','Review submissions'), description: tr(language,'Theo dõi tiến độ và đánh giá','Track progress and evaluate'), onClick: () => onNavigate('submissions')},
    {icon: Landmark, title: tr(language,'Tham quan triển lãm','Explore museums'), description: tr(language,'Xem, chia sẻ và công bố','Browse, share and publish'), variant:'yellow', onClick: () => onNavigate('exhibitions')},
    {icon: CalendarDays, title: tr(language,'Kế hoạch bài dạy','Teaching plan'), description: tr(language,'Xem trình tự và mục tiêu bài học','Review lesson sequence and objectives'), variant:'navy', onClick: () => onNavigate('teaching-plan')},
  ];

  return (
    <>
      <EditorialHeading
        kicker={tr(language, 'KHÔNG GIAN LÀM VIỆC DỰ ÁN · LỚP 11', 'PROJECT WORKSPACE · GRADE 11')}
        title={tr(language, 'Giảng dạy hóa thành bảo tàng.', 'Teaching that becomes a museum.')}
        description={tr(language,
          'Bài học tiếng Anh theo dự án · Global Success · Unit 5: Global Warming',
          'A digital, project-based English lesson · Global Success · Unit 5: Global Warming')}
        aside={tr(language, 'Bốn khu vực trọng tâm · Một minh chứng học tập chung', 'Four focused areas · One shared evidence trail')}
      />

      <div className="project-feature">
        <div className="feature-copy">
          <div className="feature-kicker">01 / {tr(language,'Trải nghiệm học tập nổi bật','Featured learning experience')}</div>
          <h2 className="feature-title">{primary?.title || 'Our Climate Action Museum.'}</h2>
          <p className="feature-sub">
            {tr(language,'Đọc dự án · Quản lý ','Read the project · Manage ') + total +
             tr(language,' nhóm · Khám phá công bố',' groups · Explore published work')}
          </p>
        </div>
        <div className="feature-art" aria-hidden="true">
          <div className="feature-art-inner">CLIMATE<br/>ACTION<br/><span style={{color:'#f9d364'}}>MUSEUM ↗</span></div>
        </div>
      </div>

      <div className="section-title"><span>{tr(language,'LỐI TẮT LÀM VIỆC','WORKSPACE SHORTCUTS')}</span><span className="right">{tr(language,'Chọn không gian làm việc','Select a workspace')}</span></div>
      <div className="actions-grid">
        {shortcuts.filter(s=>s.onClick).map((s, i) => <ActionTile key={i} {...s} />)}
      </div>

      <div className="content-gap">
        <div className="section-title"><span>{tr(language,'CHỈ SỐ DỰ ÁN TRỰC TIẾP','LIVE PROJECT FIGURES')}</span><span className="right">{tr(language,'Từ dữ liệu thực','From live records')}</span></div>
      </div>
      <MetricStrip items={metrics} />

      <div className="two-col content-gap">
        <section>
          <div className="section-title">
            <span>{tr(language,'BÀI HỌC GẦN ĐÂY','RECENT LESSONS')}</span>
            <button type="button" className="small-link right" onClick={() => onNavigate('lessons')}>
              {tr(language,'Xem tất cả','View all')} <ChevronRight size={13} aria-hidden="true" style={{verticalAlign:'middle'}}/>
            </button>
          </div>
          <ContentPanel variant="warm" ariaLabel={tr(language,'Bài học gần đây','Recent lessons')}>
            {!assignments.length ? (
              <p className="muted">{tr(language,'Chưa có bài học nào.','No lessons yet.')}</p>
            ) : assignments.slice(0,5).map(a => {
              const gs = groups.filter(g => g.assignment_id === a.id);
              const done = gs.filter(g => SUBMITTED_STATES.includes(g.state)).length;
              const ex = gs.filter(g => exitTickets.some(t => t.group_id === g.id)).length;
              const pctg = gs.length ? done / gs.length * 100 : 0;
              return (
                <div className="list-row" key={a.id}>
                  <Leaf size={26} aria-hidden="true" style={{flexShrink:0}}/>
                  <div style={{flex:1, minWidth:0}}>
                    <b>{a.title}</b>
                    <small>{tr(language,'Tiếng Anh theo dự án','Project-based English')} · {a.class_scope} · {gs.length} {tr(language,'nhóm','groups')}</small>
                  </div>
                  <div style={{width:124, flexShrink:0}}>
                    <div className="progress" role="progressbar" aria-valuenow={Math.round(pctg)} aria-valuemin={0} aria-valuemax={100}><i style={{width: pctg + '%'}}/></div>
                    <small>{done}/{gs.length}</small>
                  </div>
                  <ArrowRight size={18} aria-hidden="true" style={{flexShrink:0}}/>
                </div>
              );
            })}
            <div style={{color:'#687887', fontSize:12, padding:'14px 2px 0'}}>
              Exit Tickets: {exitCount}/{total} &nbsp; · &nbsp; {tr(language,'Sản phẩm bảo tàng','Museum projects')}: {submittedCount}/{total}
            </div>
          </ContentPanel>
        </section>

        <section>
          <div className="section-title">
            <span>{tr(language,'TRẠNG THÁI NHÓM','GROUP STATUS')}</span>
            <span className="right">{submittedCount} {tr(language,'nhóm đã công bố','published groups')}</span>
          </div>
          {!linked.length ? (
            <p className="muted">{tr(language,'Chưa có nhóm nào.','No groups yet.')}</p>
          ) : (
            <div className="group-grid">
              {linked.map((g, i) => {
                const prog = progressOfGroup(g.state, language);
                const label = language==='en' ? englishSystemGroupLabel(g.label) : g.label;
                return (
                  <GroupCard key={g.id} mode="tile"
                    groupLabel={label || (tr(language,'Nhóm ','Group ') + (i+1))}
                    statusLabel={prog.label}
                    statusKind={g.state}
                    onClick={() => onNavigate('submissions')} />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
