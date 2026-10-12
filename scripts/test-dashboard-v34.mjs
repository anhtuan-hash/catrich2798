import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page = read('src/pages/WorkDashboard.jsx');
const planner = read('src/components/DashboardWeeklyPlanner.jsx');
const news = read('src/components/DashboardNewsHub.jsx');
const css = read('src/styles/dashboard-v34-wide-news.css');
const previous = read('src/styles/dashboard-unified-v33.css');
const workflow = read('.github/workflows/dashboard-command-center-v2.yml');

// The dashboard and the site footer share one width token.
assert.match(css,/--dashboard-shell-width:min\(1520px/);
assert.match(css,/\.gd-shell\.gd-shell-v3/);
assert.match(css,/width:var\(--dashboard-shell-width\)!important/);
assert.match(css,/footer\.footer\.signature-footer-collapsible/);
assert.match(page,/gd-page gd-v31-page gd-v32-page gd-u33 gd-u34/);
assert.match(page,/dashboard-v34-wide-news\.css/);
assert.match(previous,/--u-radius:18px/);

// The weekly strip is navigation-only; ONE detailed agenda is the existing calendar.
assert.match(planner,/data-dashboard-weekly-planner="true"/);
assert.match(planner,/onSelectDay\?\.\(day\.key\)/);
assert.match(planner,/gd-u34-week-summary/);
assert.match(planner,/gd-u34-open-schedule/);
assert.doesNotMatch(planner,/className="gd-v32-planner-agenda"/);
assert.doesNotMatch(planner,/function PlanRow\(/);
assert.match(page,/onSelectDay=\{openSelectedScheduleDay\}/);
assert.match(page,/setCalendarRange\('selected'\)/);
assert.match(page,/displayedEvents\.map/);
assert.match(page,/dateKey\(displayScheduleDate\)/);
assert.match(page,/calendarRange === 'selected'/);
assert.match(page,/setSelectedScheduleDay\(''\)/);
assert.match(page,/id="dashboard-calendar"/);
assert.match(css,/gd-v32-planner-body\.gd-u34-week-summary/);

// News isn't hidden behind another click, but still lazy-loads near viewport.
assert.match(page,/const \[newsExpanded, setNewsExpanded\] = useState\(true\)/);
assert.match(page,/IntersectionObserver/);
assert.match(news,/className="dnh-story-summary"/);
assert.match(news,/\{item\.summary\}/);
assert.match(css,/dnh-featured-copy p/);
assert.match(css,/dnh-story-summary/);
assert.match(css,/-webkit-line-clamp:unset!important/);
assert.match(css,/max-height:none!important/);
assert.match(css,/white-space:normal!important/);
assert.match(css,/overflow:visible!important/);
assert.match(css,/gd-u34\.gd-v31-midnight/);
assert.match(css,/@media \(max-width:720px\)/);

// No globally applied body styles or new animation loops.
assert.doesNotMatch(css,/\n(?:html|body|\*|\:root)\s*\{/);
assert.doesNotMatch(css,/@keyframes/);
assert.match(workflow,/test-dashboard-v34\.mjs/);
console.log('PASS Dashboard 3.4: full-width parity, readable news, single detailed calendar, date selection and responsive scoping.');
