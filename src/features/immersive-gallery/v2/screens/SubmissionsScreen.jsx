import React from 'react';
import {Users} from 'lucide-react';
import EditorialHeading from '../shell/EditorialHeading.jsx';
import MetricStrip from '../shell/MetricStrip.jsx';
import ContentPanel from '../shell/ContentPanel.jsx';
import {Submissions} from '../../v3/MuseumReview.jsx';

const tr = (lang, vi, en) => lang === 'en' ? en : vi;

// SubmissionsScreen — 02. Swiss chrome (heading + computed metric strip)
// wraps the existing v3 <Submissions> review desk, which preserves ALL
// behavior: filters, preview, rubric grading, approve/return/reject,
// publish, archive, frozen-lesson read-only locks. List/card styling is
// delegated to the existing component (partial redesign); no behavior lost.
// Props: {language, data, staff, onNavigate, onRefresh, initialReview, transport, query}.
export default function SubmissionsScreen({language='en', data, staff, onNavigate, onRefresh, initialReview, transport, query=''}) {
  const payload = data || staff || {};
  const reviews = payload.reviews || [];
  const exitTickets = payload.exitTickets || [];
  const counts = {
    all: reviews.length,
    submitted: reviews.filter(r => r.state === 'submitted').length,
    ttcm_review: reviews.filter(r => r.state === 'ttcm_review').length,
    changes_requested: reviews.filter(r => r.state === 'changes_requested').length,
    approved_locked: reviews.filter(r => r.state === 'approved_locked').length,
  };
  const metrics = [
    {value: String(counts.all), label: tr(language,'Bảo tàng đã nộp','Museum submissions')},
    {value: String(exitTickets.length), label: 'Exit Tickets'},
    {value: String(counts.submitted + counts.ttcm_review), label: tr(language,'Chờ Admin','Awaiting admin review')},
    {value: String(counts.approved_locked), label: tr(language,'Đã duyệt','Approved'), highlight: true},
  ];
  return (
    <>
      <EditorialHeading
        kicker={tr(language, 'ĐÁNH GIÁ HỌC TẬP', 'LEARNING ASSESSMENT')}
        title={tr(language, 'Bài nộp của học sinh', 'Student submissions.')}
        description={tr(language,
          'Đây là bài nộp bảo tàng; Exit Ticket được xem riêng trong Bài học.',
          'Museum project submissions appear here. Exit Tickets are available under Lessons.')}
        aside={<span><Users size={15} aria-hidden="true" style={{verticalAlign:'middle'}}/> {counts.all} {tr(language,'bảo tàng đã nộp','museum submissions')} · {exitTickets.length} Exit Tickets</span>}
      />
      <MetricStrip items={metrics} />
      <div className="content-gap" />
      <ContentPanel ariaLabel={tr(language,'Bàn duyệt bài nộp','Submission review desk')}>
        <Submissions key={initialReview || 'normal'} language={language} data={payload}
          query={query} initialReview={initialReview}
          onNavigate={onNavigate} onRefresh={onRefresh} />
      </ContentPanel>
      <div className="info-strip mt20" role="note">
        {tr(language,
          'Màn hình phân biệt bài nộp bảo tàng với Exit Ticket; trạng thái và số liệu luôn lấy từ bản ghi thực.',
          'Museum submissions are kept separate from Exit Tickets. Statuses and counts are connected to actual records.')}
      </div>
    </>
  );
}
