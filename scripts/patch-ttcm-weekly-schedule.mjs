import fs from 'node:fs';

const jsPath = 'src/components/GlobalWorkScheduleCenter.jsx';
const cssPath = 'src/components/GlobalWorkScheduleCenter.css';

let src = fs.readFileSync(jsPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) {
    if (source.includes(to)) return source;
    throw new Error(`Missing marker: ${label}`);
  }
  return source.replace(from, to);
}

src = replaceOnce(
  src,
`function addMonths(value, amount) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}
`,
`function addMonths(value, amount) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function startOfWeek(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const mondayIndex = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayIndex);
  return date;
}

function addWeeks(value, amount) {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + amount * 7);
  return date;
}

function weekCells(cursor) {
  const monday = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function formatWeekRange(value, language) {
  const monday = startOfWeek(value);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const startLabel = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(monday);
  const endLabel = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(sunday);
  return language === 'vi' ? `Tuần ${startLabel} – ${endLabel}` : `${startLabel} – ${endLabel}`;
}
`,
  'week helpers',
);

src = replaceOnce(
  src,
`  const [calendarMode, setCalendarMode] = useState('month');
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('upcoming');`,
`  const [calendarMode, setCalendarMode] = useState(() => embedded ? 'week' : 'month');
  const [cursor, setCursor] = useState(() => embedded ? startOfWeek(new Date()) : startOfMonth(new Date()));
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState(() => embedded ? 'all' : 'upcoming');`,
  'weekly default state',
);

src = replaceOnce(
  src,
`  const cells = useMemo(() => monthCells(cursor), [cursor]);`,
`  const cells = useMemo(() => calendarMode === 'week' ? weekCells(cursor) : monthCells(cursor), [calendarMode, cursor]);`,
  'weekly cells',
);

src = replaceOnce(
  src,
`          <div className="work-schedule-month-nav">
            <button type="button" onClick={() => setCursor(addMonths(cursor, -1))}>‹</button>
            <strong>{formatMonth(cursor, language)}</strong>
            <button type="button" onClick={() => setCursor(addMonths(cursor, 1))}>›</button>
            <button type="button" className="today" onClick={() => setCursor(startOfMonth(new Date()))}>Hôm nay</button>
          </div>`,
`          <div className="work-schedule-month-nav">
            <button type="button" aria-label={calendarMode === 'week' ? 'Tuần trước' : 'Tháng trước'} onClick={() => setCursor(calendarMode === 'week' ? addWeeks(cursor, -1) : addMonths(cursor, -1))}>‹</button>
            <strong>{calendarMode === 'week' ? formatWeekRange(cursor, language) : formatMonth(cursor, language)}</strong>
            <button type="button" aria-label={calendarMode === 'week' ? 'Tuần sau' : 'Tháng sau'} onClick={() => setCursor(calendarMode === 'week' ? addWeeks(cursor, 1) : addMonths(cursor, 1))}>›</button>
            <button type="button" className="today" onClick={() => setCursor(calendarMode === 'week' ? startOfWeek(new Date()) : startOfMonth(new Date()))}>Hôm nay</button>
          </div>`,
  'week navigation',
);

src = replaceOnce(
  src,
`            <div className="work-schedule-view-toggle">
              <button type="button" className={calendarMode === 'month' ? 'active' : ''} onClick={() => setCalendarMode('month')}>Tháng</button>
              <button type="button" className={calendarMode === 'agenda' ? 'active' : ''} onClick={() => setCalendarMode('agenda')}>Danh sách</button>
            </div>`,
`            <div className="work-schedule-view-toggle">
              <button type="button" className={calendarMode === 'week' ? 'active' : ''} onClick={() => { setCalendarMode('week'); setCursor(startOfWeek(cursor)); }}>Tuần</button>
              <button type="button" className={calendarMode === 'month' ? 'active' : ''} onClick={() => { setCalendarMode('month'); setCursor(startOfMonth(cursor)); }}>Tháng</button>
              <button type="button" className={calendarMode === 'agenda' ? 'active' : ''} onClick={() => setCalendarMode('agenda')}>Danh sách</button>
            </div>`,
  'week toggle',
);

src = replaceOnce(
  src,
`        {calendarMode === 'month' ? <div className="work-schedule-calendar">`,
`        {calendarMode !== 'agenda' ? <div className={\`work-schedule-calendar ${calendarMode === 'week' ? 'is-week' : ''}\`}>`,
  'week calendar condition',
);

src = replaceOnce(
  src,
`            const outside = date.getMonth() !== cursor.getMonth();`,
`            const outside = calendarMode === 'month' && date.getMonth() !== cursor.getMonth();`,
  'week outside-day treatment',
);

const cssAddition = `

/* TTCM weekly calendar: the embedded schedule opens on the current week. */
.work-schedule-calendar.is-week .work-schedule-grid>article{
  min-height:clamp(300px,52vh,520px);
  border-bottom:0;
}
.work-schedule-calendar.is-week .work-schedule-grid>article>header{
  margin-bottom:10px;
}
.work-schedule-calendar.is-week .work-schedule-grid>article>header time{
  width:30px;
  height:30px;
  font-size:13px;
}
.work-schedule-calendar.is-week .work-schedule-grid>article>div{
  gap:7px;
}
.work-schedule-calendar.is-week .work-schedule-grid>article>div>button{
  min-height:42px;
  padding:7px 8px;
  border-radius:9px;
}
.work-schedule-calendar.is-week .work-schedule-grid button time{
  font-size:10px;
}
.work-schedule-calendar.is-week .work-schedule-grid button span{
  font-size:11px;
}
.work-schedule-month-nav strong{
  min-width:220px;
}
@media(max-width:900px){
  .work-schedule-calendar.is-week{overflow-x:auto}
  .work-schedule-calendar.is-week .work-schedule-weekdays,
  .work-schedule-calendar.is-week .work-schedule-grid{min-width:980px}
}
`;

if (!css.includes('TTCM weekly calendar: the embedded schedule opens on the current week.')) {
  css += cssAddition;
}

fs.writeFileSync(jsPath, src);
fs.writeFileSync(cssPath, css);
console.log('Patched TTCM schedule to weekly default.');
