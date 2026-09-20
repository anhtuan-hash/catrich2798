import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../utils/supabase.js';
import './QuestionBankQualityControl.css';

const QUALITY_TABS = [
  ['golden', 'Golden Bank'],
  ['coverage', 'Coverage'],
  ['performance', 'Item Performance'],
  ['review', 'Review Queue'],
];

const ISSUE_LABELS = {
  options_not_four: 'Không đủ 4 phương án',
  invalid_correct_answer: 'Đáp án đúng không hợp lệ',
  missing_stem: 'Thiếu câu hỏi',
  missing_explanation: 'Thiếu giải thích',
  missing_topic: 'Thiếu chủ đề',
  missing_skill: 'Thiếu kỹ năng',
  missing_cefr: 'Thiếu CEFR',
  missing_fingerprint: 'Thiếu fingerprint',
  missing_tags: 'Thiếu tag',
  difficulty_out_of_range: 'Độ khó ngoài 1–5',
  duplicate_options: 'Phương án bị trùng',
  duplicate_fingerprint: 'Fingerprint bị trùng',
  broken_bundle: 'Cấu trúc chùm bị lỗi',
  item_not_approved: 'Câu chưa duyệt',
  bundle_not_approved: 'Chùm chưa duyệt',
};

const HEALTH_LABELS = {
  no_data: 'Chưa có dữ liệu',
  collecting: 'Đang thu thập',
  too_easy: 'Quá dễ',
  too_hard: 'Quá khó',
  low_discrimination: 'Phân hóa thấp',
  good: 'Tốt',
};

function integer(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function percent(value) {
  if (value === null || value === undefined || value === '') return '—';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(parsed % 1 ? 1 : 0)}%` : '—';
}

function compact(value, limit = 120) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  return text.length > limit ? `${text.slice(0, limit)}…` : text || '—';
}

function bundleLabel(value) {
  const map = {
    discourse_cloze_5: 'Discourse Cloze 5',
    functional_cloze_6: 'Functional Cloze 6',
    reading_8: 'Reading 8',
    reading_10: 'Reading 10',
  };
  return map[value] || value || 'Câu độc lập';
}

export default function QuestionBankQualityControl({
  blueprints = [],
  onOpenQuestion,
  onOpenBundle,
}) {
  const preferredBlueprint = useMemo(
    () => blueprints.find((item) => item?.criteria?.preset === 'tnthpt_40')
      || blueprints.find((item) => /TN THPT 40/i.test(item?.title || ''))
      || blueprints[0]
      || null,
    [blueprints],
  );

  const [activeTab, setActiveTab] = useState('golden');
  const [selectedBlueprintId, setSelectedBlueprintId] = useState('');
  const [targetExams, setTargetExams] = useState(10);
  const [dashboard, setDashboard] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!selectedBlueprintId && preferredBlueprint?.id) {
      setSelectedBlueprintId(preferredBlueprint.id);
    }
  }, [preferredBlueprint, selectedBlueprintId]);

  const loadQuality = useCallback(async () => {
    if (!supabase || !selectedBlueprintId) return;
    setLoading(true);
    setMessage('');
    try {
      const [dashboardResult, issuesResult] = await Promise.all([
        supabase.rpc('qb_quality_dashboard', {
          p_blueprint_id: selectedBlueprintId,
          p_target_exams: Math.max(1, Math.min(100, Number(targetExams) || 10)),
          p_item_limit: 100,
        }),
        supabase.rpc('qb_golden_bank_issues', { p_limit: 1000 }),
      ]);
      if (dashboardResult.error) throw dashboardResult.error;
      if (issuesResult.error) throw issuesResult.error;
      setDashboard(dashboardResult.data || null);
      setIssues(issuesResult.data || []);
    } catch (error) {
      setMessage(error?.message || 'Không thể tải Quality Control.');
    } finally {
      setLoading(false);
    }
  }, [selectedBlueprintId, targetExams]);

  useEffect(() => { loadQuality(); }, [loadQuality]);

  const audit = dashboard?.audit || {};
  const summary = audit.summary || {};
  const metadata = audit.metadata || {};
  const coverage = dashboard?.coverage || {};
  const practice = dashboard?.practice || {};
  const performance = Array.isArray(dashboard?.itemPerformance) ? dashboard.itemPerformance : [];
  const reviewRows = issues.filter((item) => item.classification === 'review');
  const blockedRows = issues.filter((item) => item.classification === 'blocked');
  const actionableIssues = [...blockedRows, ...reviewRows];

  return (
    <section className="qb-quality-control">
      <div className="qb-quality-hero">
        <div>
          <p>BRIAN QUESTION BANK · QUALITY CONTROL</p>
          <h2>Kiểm soát chất lượng ngân hàng</h2>
          <span>Audit cấu trúc, đo sức chứa ma trận, theo dõi dữ liệu học sinh và gom hàng đợi cần duyệt trên cùng một màn hình.</span>
        </div>
        <button type="button" className="qb-primary" onClick={loadQuality} disabled={loading || !selectedBlueprintId}>
          {loading ? 'Đang cập nhật…' : '↻ Cập nhật'}
        </button>
      </div>

      <div className="qb-quality-controls">
        <label>
          <span>Ma trận phân tích</span>
          <select value={selectedBlueprintId} onChange={(event) => setSelectedBlueprintId(event.target.value)}>
            {!blueprints.length ? <option value="">Chưa có ma trận đã lưu</option> : null}
            {blueprints.map((blueprint) => (
              <option key={blueprint.id} value={blueprint.id}>{blueprint.title} · {blueprint.total_items} câu</option>
            ))}
          </select>
        </label>
        <label>
          <span>Mục tiêu số đề</span>
          <input
            type="number"
            min="1"
            max="100"
            value={targetExams}
            onChange={(event) => setTargetExams(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
          />
        </label>
        <div className="qb-quality-live">
          <span>Practice telemetry</span>
          <strong>{integer(practice.responses)}</strong>
          <small>phản hồi thật từ học sinh</small>
        </div>
      </div>

      {message ? <div className="qb-quality-message">{message}</div> : null}

      <div className="qb-quality-kpis">
        <article className="is-ready"><span>Ready</span><strong>{integer(summary.readyItems)}</strong><small>Có thể dùng ngay</small></article>
        <article className="is-review"><span>Review</span><strong>{integer(summary.reviewItems)}</strong><small>Cần duyệt nội dung</small></article>
        <article className="is-blocked"><span>Blocked</span><strong>{integer(summary.blockedItems)}</strong><small>Lỗi cấu trúc</small></article>
        <article><span>Sức chứa</span><strong>{integer(coverage.capacityAll)}</strong><small>đề theo ma trận đã chọn</small></article>
        <article><span>Đề mới hoàn toàn</span><strong>{integer(coverage.capacityUnused)}</strong><small>không dùng lại item lịch sử</small></article>
      </div>

      <nav className="qb-quality-tabs" aria-label="Quality Control">
        {QUALITY_TABS.map(([id, label]) => (
          <button type="button" key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
            {label}
            {id === 'review' && actionableIssues.length ? <b>{actionableIssues.length}</b> : null}
          </button>
        ))}
      </nav>

      {loading && !dashboard ? <div className="qb-quality-loading">Đang dựng báo cáo chất lượng…</div> : null}

      {!loading && !selectedBlueprintId ? (
        <div className="qb-quality-empty">Hãy tạo hoặc lưu ít nhất một ma trận để bật Quality Control.</div>
      ) : null}

      {dashboard && activeTab === 'golden' ? (
        <div className="qb-quality-section">
          <div className="qb-quality-section-head">
            <div><span>GOLDEN BANK AUDIT</span><h3>Độ sạch và khả năng sẵn sàng</h3></div>
            <small>{integer(summary.totalItems)} câu · {integer(summary.totalBundles)} chùm active</small>
          </div>

          <div className="qb-quality-audit-grid">
            <article><span>Broken bundles</span><strong>{integer(summary.brokenBundles)}</strong></article>
            <article><span>Duplicate fingerprints</span><strong>{integer(summary.duplicateFingerprintGroups)}</strong></article>
            <article><span>Repeated topic labels</span><strong>{integer(summary.repeatedTopicLabels)}</strong></article>
            <article><span>Thiếu metadata</span><strong>{integer(metadata.missingTopic) + integer(metadata.missingSkill) + integer(metadata.missingCefr) + integer(metadata.missingTags) + integer(metadata.missingExplanation) + integer(metadata.missingFingerprint)}</strong></article>
          </div>

          <div className="qb-quality-two-col">
            <section className="qb-quality-card">
              <div className="qb-quality-card-head"><h4>Chùm bài</h4><span>Approved / Structural</span></div>
              <div className="qb-quality-bundle-list">
                {(audit.bundleDistribution || []).map((row) => (
                  <article key={row.type}>
                    <div><strong>{bundleLabel(row.type)}</strong><small>{integer(row.bundles)} chùm</small></div>
                    <div><b>{integer(row.approvedReady)}</b><span>/ {integer(row.structurallyValid)}</span></div>
                  </article>
                ))}
              </div>
            </section>

            <section className="qb-quality-card">
              <div className="qb-quality-card-head"><h4>Phân bố đáp án</h4><span>Toàn bộ item active</span></div>
              <div className="qb-quality-answer-grid">
                {['A', 'B', 'C', 'D'].map((key) => (
                  <article key={key}><span>{key}</span><strong>{integer(audit.answerDistribution?.[key])}</strong></article>
                ))}
              </div>
              <p className="qb-quality-note">Phân bố này dùng để phát hiện thiên lệch kho. Khi xuất đề, Brian vẫn dùng option order riêng của từng mã đề.</p>
            </section>
          </div>
        </div>
      ) : null}

      {dashboard && activeTab === 'coverage' ? (
        <div className="qb-quality-section">
          <div className="qb-quality-section-head">
            <div><span>COVERAGE PLANNER</span><h3>{coverage.blueprintTitle || 'Ma trận đã chọn'}</h3></div>
            <small>Mục tiêu {integer(coverage.targetExams)} đề · sức chứa hiện tại {integer(coverage.capacityAll)}</small>
          </div>

          <div className="qb-quality-coverage-list">
            {(coverage.parts || []).map((part) => {
              const targetUnits = integer(part.requiredPerExam) * integer(part.targetExams);
              const ratio = targetUnits > 0 ? Math.min(100, Math.round(integer(part.approvedAvailable) / targetUnits * 100)) : 100;
              return (
                <article key={part.type}>
                  <div className="qb-quality-coverage-title">
                    <strong>{part.label}</strong>
                    <small>{part.mode === 'bundles' ? `${part.requiredPerExam} chùm/đề · ${part.itemCountPerBundle} câu/chùm` : `${part.requiredPerExam} câu/đề`}</small>
                  </div>
                  <div><span>Approved</span><b>{integer(part.approvedAvailable)}</b></div>
                  <div><span>Unused</span><b>{integer(part.unusedApprovedAvailable)}</b></div>
                  <div><span>Sức chứa</span><b>{integer(part.capacityAll)}</b></div>
                  <div><span>Thiếu cho mục tiêu</span><b className={integer(part.gapUnitsForTarget) ? 'is-gap' : 'is-ok'}>{integer(part.gapUnitsForTarget)}</b></div>
                  <div className="qb-quality-meter"><i style={{ width: `${ratio}%` }} /><span>{ratio}%</span></div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {dashboard && activeTab === 'performance' ? (
        <div className="qb-quality-section">
          <div className="qb-quality-section-head">
            <div><span>ITEM PERFORMANCE</span><h3>Dữ liệu thực nghiệm từ bài luyện</h3></div>
            <small>{integer(practice.attempts)} lượt làm · {integer(practice.responses)} phản hồi · ĐTB {percent(practice.averageScorePercent)}</small>
          </div>

          {!integer(practice.responses) ? (
            <div className="qb-quality-empty">
              Chưa có lượt làm thật. Brian không tạo dữ liệu giả; bảng này sẽ tự có độ đúng, thời gian, distractor và độ phân hóa sau khi học sinh nộp bài.
            </div>
          ) : null}

          <div className="qb-quality-performance">
            <div className="qb-quality-performance-head">
              <span>Câu hỏi</span><span>N</span><span>Đúng</span><span>TB giây</span><span>Median</span><span>Phân hóa</span><span>Trạng thái</span>
            </div>
            {performance.map((row) => (
              <article key={row.item_id}>
                <button type="button" onClick={() => onOpenQuestion?.(row.item_id)}>{compact(row.stem, 150)}</button>
                <b>{integer(row.response_count)}</b>
                <span>{percent(row.correct_percent)}</span>
                <span>{row.avg_response_seconds ?? '—'}</span>
                <span>{row.median_response_seconds ?? '—'}</span>
                <span>{row.discrimination ?? '—'}</span>
                <em className={`is-${row.health || 'no_data'}`}>{HEALTH_LABELS[row.health] || row.health || '—'}</em>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {dashboard && activeTab === 'review' ? (
        <div className="qb-quality-section">
          <div className="qb-quality-section-head">
            <div><span>REVIEW QUEUE</span><h3>Việc cần xử lý</h3></div>
            <small>{blockedRows.length} blocked · {reviewRows.length} chờ duyệt</small>
          </div>

          {!actionableIssues.length ? <div className="qb-quality-empty">Không còn item nào cần xử lý.</div> : null}

          <div className="qb-quality-review-list">
            {actionableIssues.map((row) => (
              <article key={row.item_id} className={row.classification === 'blocked' ? 'is-blocked' : 'is-review'}>
                <div className="qb-quality-review-state">
                  <strong>{row.classification === 'blocked' ? 'BLOCKED' : 'REVIEW'}</strong>
                  <span>{bundleLabel(row.bundle_type)}</span>
                </div>
                <div className="qb-quality-review-reasons">
                  {(row.reasons || []).map((reason) => <span key={reason}>{ISSUE_LABELS[reason] || reason}</span>)}
                </div>
                <div className="qb-quality-review-actions">
                  <button type="button" className="qb-secondary" onClick={() => onOpenQuestion?.(row.item_id)}>Mở câu</button>
                  {row.bundle_id ? <button type="button" className="qb-ghost" onClick={() => onOpenBundle?.(row.bundle_id)}>Mở chùm</button> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
