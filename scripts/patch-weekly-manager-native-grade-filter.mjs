import fs from 'node:fs';

const target = 'src/components/GlobalWeeklyPracticeBridge.jsx';
if (!fs.existsSync(target)) {
  throw new Error(`Missing weekly manager source: ${target}`);
}

let source = fs.readFileSync(target, 'utf8');

if (!source.includes('function inferManagerGrade(item)')) {
  const anchor = 'function ensureHost() {';
  const helper = `function inferManagerGrade(item) {
  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/\\s+/g, ' ')
    .trim();
  const explicitGrade = (value) => {
    const text = normalize(value);
    if (/^(10|11|12)$/.test(text)) return text;
    return text.match(/(?:tieng anh|english|khoi|grade|lop)\\s*(10|11|12)(?:\\b|$)/)?.[1] || '';
  };
  return explicitGrade(item?.grade)
    || explicitGrade(item?.category)
    || explicitGrade(item?.title)
    || '';
}

`;
  if (!source.includes(anchor)) throw new Error('Could not locate ensureHost anchor.');
  source = source.replace(anchor, helper + anchor);
}

const managerStart = source.indexOf('function ManagerDialog(');
const managerEnd = source.indexOf('\nexport default function GlobalWeeklyPracticeBridge', managerStart);
if (managerStart < 0 || managerEnd < 0) {
  throw new Error('Could not isolate ManagerDialog component.');
}

let manager = source.slice(managerStart, managerEnd);

if (!manager.includes("const [gradeFilter, setGradeFilter] = useState('all');")) {
  const anchor = "  const [message, setMessage] = useState('');";
  if (!manager.includes(anchor)) throw new Error('Could not locate ManagerDialog state anchor.');
  manager = manager.replace(anchor, `${anchor}\n  const [gradeFilter, setGradeFilter] = useState('all');`);
}

if (!manager.includes('const gradeCounts = useMemo(() =>')) {
  const anchor = '  useEffect(() => { refresh(); }, [refresh]);';
  const derivedState = `  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const handleRefresh = () => refresh();
    window.addEventListener('bes-weekly-manager-refresh', handleRefresh);
    return () => window.removeEventListener('bes-weekly-manager-refresh', handleRefresh);
  }, [refresh]);

  const gradeCounts = useMemo(() => items.reduce((counts, item) => {
    const grade = inferManagerGrade(item);
    if (grade && Object.prototype.hasOwnProperty.call(counts, grade)) counts[grade] += 1;
    else counts.unclassified += 1;
    return counts;
  }, { all: items.length, 10: 0, 11: 0, 12: 0, unclassified: 0 }), [items]);

  const visibleItems = useMemo(() => gradeFilter === 'all'
    ? items
    : items.filter((item) => inferManagerGrade(item) === gradeFilter), [items, gradeFilter]);`;
  if (!manager.includes(anchor)) throw new Error('Could not locate ManagerDialog refresh effect.');
  manager = manager.replace(anchor, derivedState);
}

if (!manager.includes('data-native-grade-filter="true"')) {
  const headingAnchor = '<section className="bes-weekly-manage-list"><h3>Các bài đã tạo</h3>';
  const toolbar = '<section className="bes-weekly-manage-list"><h3>Các bài đã tạo</h3><div className="bes-weekly-grade-filter bes-weekly-grade-filter--native" data-native-grade-filter="true"><div className="bes-weekly-grade-filter__heading"><strong>Phân loại theo khối</strong><small>Chọn khối để tra cứu nhanh các bài đã tạo.</small></div><div className="bes-weekly-grade-filter__buttons">{[\'all\', \'10\', \'11\', \'12\'].map((grade) => <button key={grade} type="button" data-grade-filter={grade} className={gradeFilter === grade ? \'is-active\' : \'\'} aria-pressed={gradeFilter === grade} disabled={grade !== \'all\' && gradeCounts[grade] === 0} onClick={() => setGradeFilter(grade)}><span>{grade === \'all\' ? \'Tất cả\' : \'Khối \' + grade}</span><b>{gradeCounts[grade]}</b></button>)}</div>{gradeCounts.unclassified > 0 ? <small className="bes-weekly-grade-filter__warning">{gradeCounts.unclassified} bài chưa có phân loại khối rõ ràng. Có thể chọn các bài này và chuyển khối bằng thanh cài đặt nhanh bên dưới.</small> : null}</div>';
  if (!manager.includes(headingAnchor)) throw new Error('Could not locate created-practices heading.');
  manager = manager.replace(headingAnchor, toolbar);
}

manager = manager.replace(
  '{!loading && !items.length ? <p>Chưa có bài nào.</p> : null}',
  "{!loading && !visibleItems.length ? <p>{gradeFilter === 'all' ? 'Chưa có bài nào.' : 'Chưa có bài thuộc Khối ' + gradeFilter + '.'}</p> : null}",
);
manager = manager.replace('{items.map((practice) =>', '{visibleItems.map((practice) =>');
manager = manager.replace('<article key={practice.id}>', '<article key={practice.id} data-practice-id={practice.id}>');

if (!manager.includes("const [gradeFilter, setGradeFilter] = useState('all');")
  || !manager.includes('data-native-grade-filter="true"')
  || !manager.includes('{visibleItems.map((practice) =>')
  || !manager.includes('data-practice-id={practice.id}')) {
  throw new Error('Native grade filter patch did not complete inside ManagerDialog.');
}

source = source.slice(0, managerStart) + manager + source.slice(managerEnd);
fs.writeFileSync(target, source);
console.log('Weekly manager native grade filter patched safely inside ManagerDialog.');
