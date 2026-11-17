import React from 'react';
import { ArrowRight, ExternalLink, FileText } from 'lucide-react';
import MuseumOfflineExport from './MuseumOfflineExport.jsx';
import MuseumWorkshopBoard from './MuseumWorkshopBoard.jsx';
import { groupWorkshopRows } from './offline/workshopRows.js';
import { englishSystemGroupLabel, saveTextFile } from './museumApi.js';
import { ASEAN_TITLE } from './aseanLesson.js';
import { getAseanPaperPlan } from './aseanPaperPlan.js';
import './aseanDossierEditorial.css';

export function AseanDossier({ data, language, transport, readOnly, onOpenGallery, onOpenReview }) {
  const tr = (vi, en) => language === 'en' ? en : vi;
  const {href:planHref, filename:planFilename} = getAseanPaperPlan(language);
  const groups = data?.groups || [];
  const assignments = data?.assignments || [];
  const galleries = data?.publishedGalleries || [];
  const canExport = !data?.publicReadOnly && (!readOnly || data?.offlineReadOnly);
  const classScopes = [...new Set(assignments.map(assignment => assignment.class_scope).filter(Boolean))];
  const publishedCount = assignments.filter(assignment => galleries.some(gallery => gallery.id === 'asean-' + assignment.id)).length;
  const publicationStatus = publishedCount === 0
    ? tr('Chưa công bố', 'Unpublished')
    : publishedCount === assignments.length
      ? tr('Đã công bố', 'Published')
      : tr(`${publishedCount}/${assignments.length} đã công bố`, `${publishedCount}/${assignments.length} published`);

  const groupScore = (groupId, stage) => {
    const grade = data?.aseanWritingScores?.find(row => row.group_id === groupId && row.stage_index === stage)?.details;
    return grade && [0,1].includes(grade.experience) && [0,1].includes(grade.advice)
      ? grade.experience + grade.advice : null;
  };

  const renderLayout = ({ board, download, feedback } = {}) => (
    <>
      <header className="asean-dossier-cover">
        <h1 aria-label={`${ASEAN_TITLE} · ${tr('Hồ sơ dự thi', 'Teaching dossier')}`}>
          <span>{tr('Hồ sơ', 'Teaching')}</span>{' '}
          <span>{tr('dự thi', 'dossier')}</span>
        </h1>
        {(download || assignments.length > 0) && (
          <div className="asean-dossier-details">
            {download && <h2>{tr('Gói offline · Chỉ đọc', 'Offline pack · Read only')}</h2>}
            {assignments.length > 0 && (
              <dl className="asean-dossier-metadata">
                <div><dt>{tr('Lớp', 'Class')}</dt><dd>{classScopes.join(' · ') || '—'}</dd></div>
                <div><dt>{tr('Trạng thái', 'Status')}</dt><dd>{publicationStatus}</dd></div>
              </dl>
            )}
          </div>
        )}
        {download}
        <ul className="asean-dossier-documents">
          <li><a href="/museum/asean/asean-project-overview.docx" download="ASEAN_Project_Overview.docx">
            <span>{tr('Phần 1 · Tổng quan dự án', 'Part 1 · Project overview')}</span><ArrowRight aria-hidden="true" size={22}/>
          </a></li>
          <li><a href={planHref} download={planFilename}>
            <span>{tr('Phần 2 · Kế hoạch bài dạy và phụ lục', 'Part 2 · Teaching plan and appendices')}</span><ArrowRight aria-hidden="true" size={22}/>
          </a></li>
        </ul>
      </header>

      <div className="asean-dossier-register">
        {board}
        {feedback}
        {assignments.map(assignment => {
          const classGroups = groups.filter(group => group.assignment_id === assignment.id);
          const rows = classGroups.map(group => ({
            group: englishSystemGroupLabel(group.label),
            baseline: groupScore(group.id, 0),
            transfer: groupScore(group.id, 5),
          }));
          const paired = rows.filter(row => row.baseline !== null && row.transfer !== null);
          const gallery = galleries.find(item => item.id === 'asean-' + assignment.id);
          const summary = {
            paired: paired.length,
            awaitingScores: rows.length - paired.length,
            higher: paired.filter(row => row.transfer > row.baseline).length,
            unchanged: paired.filter(row => row.transfer === row.baseline).length,
            lower: paired.filter(row => row.transfer < row.baseline).length,
            fullMarksBaseline: paired.filter(row => row.baseline === 2).length,
            fullMarksTransfer: paired.filter(row => row.transfer === 2).length,
          };
          if (!gallery && rows.length === 0) return null;

          const classTitle = `${assignment.class_scope} · ${assignment.title}`;
          return (
            <section className="asean-dossier-class" key={assignment.id} aria-label={classTitle}>
              {(!board || assignments.length > 1) && <h2>{classTitle}</h2>}
              <div className="asean-dossier-actions">
                {gallery && (
                  <button type="button" className="bml-outline" onClick={() => onOpenGallery(gallery.id)}>
                    <ExternalLink size={18} aria-hidden="true"/>{tr('Triển lãm 3D (Museum Lab)', '3D exhibition (Museum Lab)')}
                  </button>
                )}
                {canExport && (
                  <button type="button" className="bml-outline" onClick={() => saveTextFile(
                    'ASEAN_Group_Writing.json', 'application/json',
                    JSON.stringify({ class: assignment.class_scope, summary, groups: rows }, null, 2),
                  )}>
                    <FileText size={18} aria-hidden="true"/>{tr('Xuất điểm viết theo nhóm', 'Export group writing summary')}
                  </button>
                )}
              </div>
              {rows.length > 0 && (
                <p>{tr(
                  `Nhóm có đủ hai điểm viết: ${summary.paired}/${rows.length} · Tăng ${summary.higher} · Không đổi ${summary.unchanged} · Giảm ${summary.lower}`,
                  `Paired group writing scores: ${summary.paired}/${rows.length} · Higher ${summary.higher} · Unchanged ${summary.unchanged} · Lower ${summary.lower}`,
                )}</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );

  return (
    <section className="swiss-editorial-dossier" data-testid="asean-dossier">
      {data?.profile?.id && !readOnly
        ? <MuseumOfflineExport data={data} language={language} transport={transport} renderLayout={renderLayout}/>
        : <div className="asean-dossier-layout">{renderLayout({
          board: data?.publicReadOnly && groups.length > 0 && (
            <MuseumWorkshopBoard rows={groupWorkshopRows({ staff: data })} language={language} editorial asean
              action={{
                label: tr('Bài nộp', 'Submission'),
                render: row => {
                  const review = data.reviews?.find(item => item.group_id === row.id && item.state === 'published');
                  return review ? <button type="button" className="bml-outline" onClick={() => onOpenReview(review.id)}>
                    {tr('Xem bài', 'View submission')}
                  </button> : '—';
                },
              }}/>
          ),
        })}</div>}
    </section>
  );
}
