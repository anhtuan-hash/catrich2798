import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge = fs.readFileSync('src/components/GlobalWorkHubGoogleHeroV2.jsx', 'utf8');
const styles = fs.readFileSync('src/components/GlobalWorkHubGoogleHeroV2.css', 'utf8');
const navigation = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');

assert.match(bridge, /createPortal/);
assert.match(bridge, /Tạo công việc/);
assert.match(bridge, /Xem lịch làm việc/);
assert.match(bridge, /Kho học liệu/);
assert.match(bridge, /Công việc đang xử lý/);
assert.match(bridge, /Trạng thái công việc/);
assert.match(bridge, /v1093-metrics/);
assert.match(styles, /grid-template-areas/);
assert.match(styles, /work-hub-google-hero-summary/);
assert.match(styles, /conic-gradient/);
assert.match(styles, /@media \(max-width:720px\)/);
assert.match(navigation, /GlobalWorkHubGoogleHeroV2/);
assert.match(navigation, /GlobalWorkHubGoogleHeroV2\.css/);

console.log('Google Work Hub hero v2 contract passed.');
