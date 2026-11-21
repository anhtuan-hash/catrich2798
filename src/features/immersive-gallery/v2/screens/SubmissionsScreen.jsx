import React from 'react';
import MetricStrip from '../shell/MetricStrip.jsx';
import {isAsean} from '../../v3/aseanLesson.js';
import {Submissions} from '../../v3/MuseumReview.jsx';

const tr = (lang, vi, en) => lang === 'en' ? en : vi;

export default function SubmissionsScreen({language='en', data, staff, onNavigate, onRefresh, initialReview, transport, query='',lessonTemplate,catalogue=false}) {
  const payload = data || staff || {};
  const asean=isAsean(lessonTemplate);
  const reviews = payload.reviews || [];
  const exitTickets = payload.exitTickets || [];
  const metrics = [
    {value: String(reviews.length), label: tr(language,'Bảo tàng đã nộp','Museum submissions')},
    {value: String(asean?(payload.aseanResponses||[]).filter(r=>r.stage_index===5).length:exitTickets.length), label: asean&&catalogue?tr(language,'Phiếu vận dụng của nhóm','Group transfer cards'):asean?'Group transfer cards':'Exit Tickets'},
    {value: String(reviews.filter(r => r.state === 'submitted' || r.state === 'ttcm_review').length), label: tr(language,'Chờ Admin','Awaiting admin review')},
    {value: String(reviews.filter(r => r.state === 'approved_locked').length), label: tr(language,'Đã duyệt','Approved')},
  ];
  const figuresLabel = tr(language,'Số liệu bài nộp','Submission figures');
  return (
    <div className="swiss-editorial-submissions">
      <header className="swiss-editorial-submissions-hero">
        <div className="swiss-editorial-submissions-title">
          {catalogue?<h1>{tr(language,'Bài nộp của học sinh','Student submissions')}</h1>:<><h1>{tr(language, 'Bài nộp của', 'Student')}{' '}
            <span>{tr(language, 'học sinh', 'submissions.')}</span></h1>
          <p>{asean?'Review each group’s three-frame exhibit and its revision.':tr(language,
            'Đây là bài nộp bảo tàng. Exit Ticket được xem riêng trong Bài học.',
            'Museum project submissions appear here. Exit Tickets are available under Lessons.')}</p></>}
        </div>
        {catalogue?<div className="swiss-editorial-submissions-count"><strong>{metrics[0].value}</strong><span>{metrics[0].label}</span></div>:
          <MetricStrip items={metrics} ariaLabel={figuresLabel} />}
      </header>
      <Submissions key={initialReview || 'normal'} language={language} data={payload}
        query={query} initialReview={initialReview}
        onNavigate={onNavigate} onRefresh={onRefresh} transport={transport} editorial catalogue={catalogue}
        summary={catalogue?<MetricStrip items={metrics.slice(1)} ariaLabel={figuresLabel}/>:null} />
    </div>
  );
}
