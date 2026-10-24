/** Local, per-browser visual preferences; never mutates the shared Focus scene. */
export const FOCUS_TRANSITION_STORAGE_KEY = 'brian-focus:transitions:v1';
export const FOCUS_TRANSITIONS = Object.freeze([
  { id: 'portal', labelVi: 'Cổng ánh sáng', labelEn: 'Light portal', detailVi: 'Lan tỏa từ nút Focus', detailEn: 'Reveals from the Focus bubble', tone: 'indigo', category: 'cinema' },
  { id: 'fade', labelVi: 'Tan dần', labelEn: 'Soft fade', detailVi: 'Êm dịu, tối giản', detailEn: 'Gentle and minimal', tone: 'cyan', category: 'gentle' },
  { id: 'zoom', labelVi: 'Phóng điện ảnh', labelEn: 'Cinematic zoom', detailVi: 'Tiến gần đầy chiều sâu', detailEn: 'Immersive perspective', tone: 'violet', category: 'cinema' },
  { id: 'rise', labelVi: 'Bay lên', labelEn: 'Float up', detailVi: 'Nâng nhẹ từ dưới màn hình', detailEn: 'Soft upward motion', tone: 'mint', category: 'gentle' },
  { id: 'slide', labelVi: 'Trượt ngang', labelEn: 'Side glide', detailVi: 'Trượt mượt từ cạnh màn hình', detailEn: 'Smooth lateral glide', tone: 'blue', category: 'gentle' },
  { id: 'curtain', labelVi: 'Mở rèm', labelEn: 'Curtain reveal', detailVi: 'Mở ra từ chính giữa', detailEn: 'Unfolds from the center', tone: 'rose', category: 'cinema' },
  { id: 'iris', labelVi: 'Ống kính', labelEn: 'Iris', detailVi: 'Vòng tròn mở tại tâm', detailEn: 'Expanding central aperture', tone: 'amber', category: 'cinema' },
  { id: 'flip', labelVi: 'Lật trang 3D', labelEn: '3D flip', detailVi: 'Xoay nhẹ theo chiều sâu', detailEn: 'Subtle 3D rotation', tone: 'purple', category: 'cinema' },
  { id: 'blur', labelVi: 'Lấy nét', labelEn: 'Dream focus', detailVi: 'Từ mờ ảo đến sắc nét', detailEn: 'Blur to crisp', tone: 'sky', category: 'gentle' },
  { id: 'none', labelVi: 'Không hiệu ứng', labelEn: 'No motion', detailVi: 'Chuyển tức thì', detailEn: 'Instant transition', tone: 'slate', category: 'gentle' },
]);
export const FOCUS_TRANSITION_IDS = Object.freeze(FOCUS_TRANSITIONS.map(x => x.id));
const allowed = value => FOCUS_TRANSITION_IDS.includes(value) ? value : 'portal';
export function normalizeFocusTransitions(value) {
  return { enter: allowed(value?.enter), exit: allowed(value?.exit) };
}
export function readFocusTransitions() {
  try { return normalizeFocusTransitions(JSON.parse(localStorage.getItem(FOCUS_TRANSITION_STORAGE_KEY) || 'null')); }
  catch { return { enter: 'portal', exit: 'portal' }; }
}
export function writeFocusTransitions(value) {
  const next = normalizeFocusTransitions(value);
  try { localStorage.setItem(FOCUS_TRANSITION_STORAGE_KEY, JSON.stringify(next)); }
  catch { /* Preferences still work until the tab is closed. */ }
  return next;
}
