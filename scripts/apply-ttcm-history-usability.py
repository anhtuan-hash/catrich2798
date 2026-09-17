from pathlib import Path
import re


def replace_required(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Expected fragment not found: {label}")
    return text.replace(old, new, 1)


# Restore the Personnel tab/workspace: JSX already renders both, but legacy CSS hid them.
personnel_path = Path("src/components/GlobalTtcmPersonnel.css")
personnel = personnel_path.read_text()
personnel, n1 = re.subn(
    r"/\* Requested removal: Nhân sự tab\. \*/\s*\.ttcm-m3-workspace-tabs > button:nth-child\(3\)\s*\{\s*display:\s*none !important;\s*\}\s*",
    "",
    personnel,
    count=1,
)
personnel, n2 = re.subn(
    r"/\* Hide legacy personnel surface if an old event tries to open it\. \*/\s*\.ttcm-m3-personnel-view\s*\{\s*display:\s*none !important;\s*\}\s*",
    "",
    personnel,
    count=1,
)
if not n1 or not n2:
    raise SystemExit("Could not remove legacy Personnel visibility overrides")
personnel_path.write_text(personnel)

component_path = Path("src/components/GlobalTtcmNavigationTab.jsx")
component = component_path.read_text()

component = replace_required(
    component,
    "  const historyNeedle = historyQuery.trim().toLowerCase();",
    """  const historyFileFilterCounts = useMemo(() => {
    const counts = { all: yearHistoryFiles.length, first: 0, resubmitted: 0, pdf: 0, word: 0, sheet: 0, archive: 0 };
    yearHistoryFiles.forEach((file) => {
      const ext = getWorkHubAttachmentExtension(file);
      if (file.statusId === 'submitted') counts.first += 1;
      if (file.statusId === 'resubmitted') counts.resubmitted += 1;
      if (ext === 'pdf') counts.pdf += 1;
      if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) counts.word += 1;
      if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) counts.sheet += 1;
      if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) counts.archive += 1;
    });
    return counts;
  }, [yearHistoryFiles]);
  const historyNeedle = historyQuery.trim().toLowerCase();""",
    "history filter counts",
)

if "function openHistoryItem(itemId)" not in component:
    anchor = "  const unseenCount = useMemo(() => items.filter("
    if anchor not in component:
        raise SystemExit("Could not find openHistoryItem insertion anchor")
    helper = """  function openHistoryItem(itemId) {
    const item = items.find((entry) => String(entry.id) === String(itemId));
    if (!item) return;
    setFilter('all');
    setSelectedItemId(String(item.id));
    setWorkspaceView('feed');
    markRead(item.id);
  }

"""
    component = component.replace(anchor, helper + anchor, 1)

component = replace_required(component, "<span>File đã nộp</span>", "<span>Tệp đã nộp</span>", "KPI wording")
component = replace_required(component, 'className="ttcm-history-timeline"', 'className="ttcm-history-timeline ttcm-history-scroll-region"', "timeline scroll region")
component = replace_required(
    component,
    "<h4>{entry.itemTitle}</h4>",
    '<h4><button type="button" className="ttcm-history-item-link" onClick={() => openHistoryItem(entry.itemId)}>{entry.itemTitle}</button></h4>',
    "timeline source link",
)
component = replace_required(
    component,
    "<div className=\"ttcm-history-event-meta\"><span className={`ttcm-history-chip is-${historyItemTypeClass(entry.itemType)}`}>{entry.itemType}</span><span className=\"ttcm-history-chip\">Phản hồi #{entry.responseIndex}</span><span className={`ttcm-history-status is-${entry.statusId || 'responded'}`}>{entry.statusLabel || 'Đã phản hồi'}</span>{entry.attachmentCount ? <><span className=\"ttcm-history-chip is-file\">Lần nộp file #{entry.fileSubmissionIndex}</span><span className=\"ttcm-history-chip is-file\">{entry.attachmentCount} file</span></> : null}</div>",
    "<div className=\"ttcm-history-event-primary\"><span className={`ttcm-history-chip is-${historyItemTypeClass(entry.itemType)}`}>{entry.itemType}</span><span className={`ttcm-history-status is-${entry.statusId || 'responded'}`}>{entry.statusLabel || 'Đã phản hồi'}</span></div><div className=\"ttcm-history-meta-line\"><span>Phản hồi #{entry.responseIndex}</span>{entry.attachmentCount ? <><span>· Lần nộp #{entry.fileSubmissionIndex}</span><span>· {entry.attachmentCount} tệp</span></> : null}</div>",
    "timeline metadata simplification",
)
component = replace_required(
    component,
    "<header><div><strong>Danh sách file đã nộp</strong><small>{visibleHistoryFiles.length}/{historySummary.fileCount} file{historySchoolYear && historySchoolYear !== 'all' ? ` · ${historySchoolYearLabel(historySchoolYear)}` : ''}</small></div><input className=\"ttcm-history-search\" type=\"search\" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder=\"Tìm tên file hoặc nội dung TTCM…\" aria-label=\"Tìm file giáo viên đã nộp\" /></header>",
    "<header><div><strong>Danh sách tệp đã nộp</strong><small>{visibleHistoryFiles.length}/{historySummary.fileCount} tệp{historySchoolYear && historySchoolYear !== 'all' ? ` · ${historySchoolYearLabel(historySchoolYear)}` : ''}</small></div><div className=\"ttcm-history-search-wrap\"><input className=\"ttcm-history-search\" type=\"search\" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder=\"Tìm tên tệp hoặc nội dung TTCM…\" aria-label=\"Tìm tệp giáo viên đã nộp\" /></div></header>",
    "file panel header/search",
)
component = replace_required(
    component,
    "{HISTORY_FILE_FILTERS.map((filterOption) => <button type=\"button\" key={filterOption.id} className={`ttcm-history-filter-chip is-${filterOption.id} ${historyFileFilter === filterOption.id ? 'is-selected' : ''}`} aria-pressed={historyFileFilter === filterOption.id} onClick={() => setHistoryFileFilter(filterOption.id)}>{filterOption.label}</button>)}",
    "{HISTORY_FILE_FILTERS.map((filterOption) => <button type=\"button\" key={filterOption.id} className={`ttcm-history-filter-chip is-${filterOption.id} ${historyFileFilter === filterOption.id ? 'is-selected' : ''}`} aria-pressed={historyFileFilter === filterOption.id} onClick={() => setHistoryFileFilter(filterOption.id)}>{filterOption.label} {historyFileFilterCounts[filterOption.id] ?? 0}</button>)}",
    "filter counts rendering",
)
component = replace_required(component, 'className="ttcm-history-files"', 'className="ttcm-history-files ttcm-history-scroll-region"', "file scroll region")
component = replace_required(component, "<thead><tr><th>File</th>", "<thead><tr><th>Tệp</th>", "file table heading")
component = replace_required(
    component,
    "<td><b>{file.itemTitle}</b><br /><small>{file.itemType}</small></td>",
    '<td><button type="button" className="ttcm-history-item-link" onClick={() => openHistoryItem(file.itemId)}>{file.itemTitle}</button><br /><small>{file.itemType}</small></td>',
    "file source link",
)
component = component.replace("'Không tìm thấy file phù hợp' : 'Giáo viên chưa nộp file'", "'Không tìm thấy tệp phù hợp' : 'Giáo viên chưa nộp tệp'")
component_path.write_text(component)

css_path = Path("src/components/GlobalTtcmTeacherHistory.css")
css = css_path.read_text()
css = replace_required(
    css,
    ".ttcm-history-view {\n  min-height: 0;\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n  padding: 18px;\n  overflow: auto;\n  background: #f8fafc;\n}",
    ".ttcm-history-view {\n  min-height: 0;\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n  padding: 18px;\n  overflow: hidden;\n  background: #f8fafc;\n}",
    "history viewport overflow",
)
css = replace_required(
    css,
    ".ttcm-history-grid { min-height: 480px; display: grid; grid-template-columns: minmax(320px, .9fr) minmax(520px, 1.4fr); gap: 14px; }",
    ".ttcm-history-grid { min-height: 0; flex: 1 1 auto; display: grid; grid-template-columns: minmax(320px, .9fr) minmax(520px, 1.4fr); gap: 14px; }",
    "history grid sizing",
)
css = replace_required(
    css,
    ".ttcm-history-panel { min-width: 0; border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; overflow: hidden; box-shadow: 0 8px 24px rgba(15, 23, 42, .045); }",
    ".ttcm-history-panel { min-width: 0; min-height: 0; display: flex; flex-direction: column; border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; overflow: hidden; box-shadow: 0 8px 24px rgba(15, 23, 42, .045); }",
    "history panel flex sizing",
)
css = replace_required(
    css,
    ".ttcm-history-search { width: min(280px, 42vw); }",
    ".ttcm-history-search-wrap { width: min(300px, 42vw); min-width: 220px; margin-left: auto; flex: 0 1 300px; }\n.ttcm-history-search { width: 100%; }",
    "search wrapper styling",
)
css = replace_required(
    css,
    ".ttcm-history-filter-chip { min-height: 30px; padding: 0 10px; border: 1px solid #dbe3ee; border-radius: 999px; background: #fff; color: #526176; font-size: 10px; font-weight: 900; cursor: pointer; }",
    ".ttcm-history-filter-chip { min-height: 30px; padding: 0 10px; border: 1px solid #dbe3ee; border-radius: 999px; background: #fff; color: #526176; font-size: 10px; font-weight: 900; font-variant-numeric: tabular-nums; cursor: pointer; }",
    "filter chip count typography",
)
css = replace_required(
    css,
    ".ttcm-history-timeline { padding: 10px 14px 16px 20px; }",
    ".ttcm-history-scroll-region { flex: 1 1 auto; min-height: 0; overflow: auto; scrollbar-width: thin; }\n.ttcm-history-timeline { padding: 10px 14px 16px 20px; }",
    "independent scroll region",
)
css = replace_required(
    css,
    ".ttcm-history-event-card h4 { margin: 4px 0 0; color: #334155; font-size: 13px; }",
    ".ttcm-history-event-card h4 { margin: 4px 0 0; color: #334155; font-size: 13px; }\n.ttcm-history-item-link { padding: 0; border: 0; background: transparent; color: #334155; font: inherit; font-weight: 800; text-align: left; cursor: pointer; }\n.ttcm-history-item-link:hover { color: #1d4ed8; text-decoration: underline; text-underline-offset: 2px; }",
    "source item link styling",
)
css = replace_required(
    css,
    ".ttcm-history-event-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }",
    ".ttcm-history-event-primary { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }\n.ttcm-history-meta-line { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px; color: #64748b; font-size: 10.5px; font-weight: 700; }",
    "timeline metadata styling",
)
css = replace_required(css, ".ttcm-history-files { overflow-x: auto; }", ".ttcm-history-files { overflow: auto; }", "file panel scrolling")
css = replace_required(
    css,
    ".ttcm-history-table tbody tr:hover { background: #fbfdff; }",
    ".ttcm-history-table tbody tr { transition: background .14s ease; }\n.ttcm-history-table tbody tr:hover { background: #f7fbff; }",
    "table hover feedback",
)
css = css.replace(
    "  .ttcm-history-panel > header { align-items: stretch; flex-direction: column; }\n  .ttcm-history-search { width: 100%; }\n  .ttcm-history-grid { min-height: 0; }",
    "  .ttcm-history-view { overflow: auto; }\n  .ttcm-history-panel > header { align-items: stretch; flex-direction: column; }\n  .ttcm-history-search-wrap { width: 100%; min-width: 0; flex-basis: auto; }\n  .ttcm-history-search { width: 100%; }\n  .ttcm-history-grid { min-height: 0; flex: none; }",
)
css_path.write_text(css)
