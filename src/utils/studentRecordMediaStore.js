
import { openDB } from 'idb';
const DB_NAME = 'bes-student-record-media-v1';
const STORE = 'media';
async function database() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('workspaceStudent', 'workspaceStudent');
      }
    },
  });
}
function mediaKey(workspaceId, studentId, captureId) {
  return [workspaceId || 'default', studentId || 'unknown', captureId].join(':');
}
export async function saveStudentRecordMedia({ workspaceId, studentId, captureId, file }) {
  if (!file || !captureId) return null;
  const db = await database();
  const key = mediaKey(workspaceId, studentId, captureId);
  await db.put(STORE, {
    key,
    workspaceStudent: [workspaceId || 'default', studentId || 'unknown'].join(':'),
    name: file.name || 'scan.jpg',
    type: file.type || 'image/jpeg',
    size: Number(file.size || 0),
    blob: file,
    createdAt: new Date().toISOString(),
  });
  return key;
}
export async function getStudentRecordMedia(key) {
  if (!key) return null;
  const db = await database();
  return db.get(STORE, key);
}
export async function deleteStudentRecordMedia(key) {
  if (!key) return;
  const db = await database();
  await db.delete(STORE, key);
}
export async function listStudentRecordMedia(workspaceId, studentId) {
  const db = await database();
  return db.getAllFromIndex(STORE, 'workspaceStudent', [workspaceId || 'default', studentId || 'unknown'].join(':'));
}
