import React from 'react';
import {LayoutGrid,BookOpen,ClipboardCheck,Landmark,CalendarDays,Presentation,FileText,Settings2} from 'lucide-react';

// SideNavigation — CONTRACT: item ids are EXACTLY these 8 values.
// MuseumLabApp maps them to existing v3 tabs:
//   overview->home, lessons->lessons, submissions->submissions,
//   exhibitions->gallery, teaching-plan->wizard, teacher-live->live,
//   competition-dossier->evidence, settings->settings.
export const NAV_ITEMS = [
  {id:'overview',           label:'Overview',            Icon:LayoutGrid},
  {id:'lessons',            label:'Lessons',             Icon:BookOpen},
  {id:'submissions',        label:'Submissions',         Icon:ClipboardCheck},
  {id:'exhibitions',        label:'Exhibitions',         Icon:Landmark},
  {id:'teaching-plan',      label:'Teaching plan',       Icon:CalendarDays},
  {id:'teacher-live',       label:'Teacher Live',        Icon:Presentation},
  {id:'competition-dossier',label:'Competition dossier', Icon:FileText},
  {id:'settings',           label:'Settings & access',   Icon:Settings2},
];

export default function SideNavigation({activeNav, onNavigate, staff}) {
  const groups = staff?.groups || [];
  const projectTitle = staff?.assignments?.[0]?.title || 'Our Climate Action Museum';
  const unit = staff?.assignments?.[0]?.subtitle || 'English 11 · Unit 5';
  return (
    <aside className="sidebar" aria-label="Immersive Gallery navigation">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">B.</div>
        <div>
          <div className="brand-name">BRIAN<br/>ENGLISH</div>
          <div className="brand-caption">TEACHING STUDIO</div>
        </div>
      </div>
      <div className="side-section">Workspace / 2026–27</div>
      <nav aria-label="Primary">
        {NAV_ITEMS.map(({id,label,Icon}) => (
          <button key={id} type="button"
            className={'navlink' + (activeNav===id ? ' active' : '')}
            aria-current={activeNav===id ? 'page' : undefined}
            onClick={() => onNavigate(id)}>
            <Icon className="icon" size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <b>{projectTitle}</b>
        {unit}<br/>
        {groups.length} groups · Project-based English
      </div>
    </aside>
  );
}
