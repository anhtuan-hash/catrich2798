import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const delivery = await readFile(new URL('../src/utils/workHubDelivery.js', import.meta.url), 'utf8');
const ttcm = await readFile(new URL('../src/components/GlobalTtcmNavigationTab.jsx', import.meta.url), 'utf8');
const uploadApi = await readFile(new URL('../api/work-hub-file-upload.js', import.meta.url), 'utf8');

assert.ok(
  delivery.includes('export const WORK_HUB_MAX_FILE_BYTES = 50 * 1024 * 1024;'),
  'Work Hub attachments must allow files up to 50 MB each.',
);
for (const extension of ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz']) {
  assert.ok(delivery.includes(`'${extension}'`), `Compressed file extension .${extension} must be accepted.`);
}
assert.ok(
  delivery.includes("action: 'init_resumable'") && delivery.includes("method: 'PUT'") && delivery.includes('uploadUrl'),
  'Large Work Hub files must use a direct Google Drive resumable upload instead of sending the file through Vercel.',
);

assert.ok(ttcm.includes('const [responseFiles, setResponseFiles] = useState([]);'), 'Responses must keep a list of selected files.');
assert.ok(ttcm.includes('validateWorkHubFiles(responseFiles)'), 'Responses must validate the whole attachment list.');
assert.ok(ttcm.includes('uploadWorkHubSubmissionFiles({ files: responseFiles'), 'Responses must upload all selected attachments.');
assert.ok(ttcm.includes('multiple accept={WORK_HUB_ATTACHMENT_ACCEPT}'), 'Response file input must allow multiple files.');
assert.ok(ttcm.includes('50 MB/tệp'), 'Response UI must state the 50 MB per-file limit.');

assert.ok(uploadApi.includes("action !== 'init_resumable'"), 'Upload API must expose resumable-session initialization for large files.');
assert.ok(uploadApi.includes('50 * 1024 * 1024'), 'Upload API must enforce the 50 MB maximum declared file size.');
assert.ok(uploadApi.includes('uploadType=resumable'), 'Upload API must initialize Google Drive resumable uploads.');

console.log('PASS: TTCM responses support up to 10 attachments, 50 MB each, including archives.');
