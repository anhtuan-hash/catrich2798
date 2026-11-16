import React from 'react';
import MetricStrip from '../shell/MetricStrip.jsx';
import {Submissions} from '../../v3/MuseumReview.jsx';

const tr = (lang, vi, en) => lang === 'en' ? en : vi;

export default function SubmissionsScreen({language='en', data, staff, onNavigate, onRefresh, initialReview, transport, query=''}) {
  const payload = data || staff || {};
  const reviews = payload.reviews || [];
  const exitTickets = payload.exitTickets || [];
  const metrics = [
    {value: String(reviews.length), label: tr(language,'Bảo tàng đã nộp','Museum submissions')},
    {value: String(exitTickets.length), label: 'Exit Tickets'},
    {value: String(reviews.filter(r => r.state === 'submitted' || r.state === 'ttcm_review').length), label: tr(language,'Chờ Admin','Awaiting admin review')},
    {value: String(reviews.filter(r => r.state === 'approved_locked').length), label: tr(language,'Đã duyệt','Approved')},
  ];
  return (
    <div className="swiss-editorial-submissions">
      <header className="swiss-editorial-submissions-hero">
        <div className="swiss-editorial-submissions-title">
          <h1>{tr(language, 'Bài nộp của', 'Student')}{' '}
            <span>{tr(language, 'học sinh', 'submissions.')}</span></h1>
          <p>{tr(language,
            'Đây là bài nộp bảo tàng. Exit Ticket được xem riêng trong Bài học.',
            'Museum project submissions appear here. Exit Tickets are available under Lessons.')}</p>
        </div>
        <MetricStrip items={metrics} ariaLabel={tr(language,'Số liệu bài nộp','Submission figures')} />
      </header>
      <Submissions key={initialReview || 'normal'} language={language} data={payload}
        query={query} initialReview={initialReview}
        onNavigate={onNavigate} onRefresh={onRefresh} transport={transport} editorial />
    </div>
  );
}
