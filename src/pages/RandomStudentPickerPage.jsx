import React from 'react';
import { RandomStudentPicker } from '../components/RandomStudentPickerBridge.jsx';
import './RandomStudentPickerGoogle.css';
import './RandomStudentPickerGooglePolish.css';

const WHITE_FIELD_DECLARATIONS = {
  background: '#ffffff',
  'background-color': '#ffffff',
  'background-image': 'none',
  'background-blend-mode': 'normal',
  'background-clip': 'padding-box',
  color: '#1f1f1f',
  '-webkit-text-fill-color': '#1f1f1f',
  'caret-color': '#0b57d0',
  'box-shadow': 'none',
  '-webkit-box-shadow': 'none',
  '-webkit-appearance': 'none',
  appearance: 'none',
  filter: 'none',
  'mix-blend-mode': 'normal',
  'color-scheme': 'light',
};

function removeLegacyWarmFieldSurface(root) {
  if (!root) return;

  // The old design system exposes a warm surface token (#FFFDF9) when fields
  // become transparent or lose focus. Neutralise that token at this app root.
  root.style.setProperty('--surface', '#ffffff', 'important');
  root.style.setProperty('--burs-surface', '#ffffff', 'important');
  root.style.setProperty('--g-surface', '#ffffff', 'important');

  root.querySelectorAll('.rspb-roster input:not([type="file"]), .rspb-roster textarea').forEach((field) => {
    Object.entries(WHITE_FIELD_DECLARATIONS).forEach(([property, value]) => {
      field.style.setProperty(property, value, 'important');
    });
    field.setAttribute('data-neutral-field', 'true');

    const label = field.closest('label');
    if (label) {
      label.style.setProperty('background', '#ffffff', 'important');
      label.style.setProperty('background-color', '#ffffff', 'important');
      label.style.setProperty('background-image', 'none', 'important');
    }
  });
}

export default function RandomStudentPickerPage({ currentUser }) {
  const pageRef = React.useRef(null);

  React.useLayoutEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    let frame = 0;
    const apply = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => removeLegacyWarmFieldSurface(root));
    };

    removeLegacyWarmFieldSurface(root);

    // The roster can be hidden and mounted again. Reapply the neutral contract
    // whenever its DOM is recreated, and after interaction state changes.
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });

    const interactionEvents = ['focusin', 'focusout', 'mouseover', 'mouseout', 'input', 'change'];
    interactionEvents.forEach((eventName) => root.addEventListener(eventName, apply, true));

    return () => {
      observer.disconnect();
      interactionEvents.forEach((eventName) => root.removeEventListener(eventName, apply, true));
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="rsp-google-page" ref={pageRef}>
      <section className="rsp-google-hero" aria-labelledby="rsp-google-title">
        <div className="rsp-google-brand" aria-hidden="true">
          <span className="rsp-google-brand-ring"><i>G</i></span>
          <span className="rsp-google-brand-dots"><i /><i /><i /><i /></span>
        </div>
        <div className="rsp-google-hero-copy">
          <span className="rsp-google-overline">BRIAN CLASSROOM · MATERIAL 3</span>
          <h1 id="rsp-google-title">Gọi tên học sinh</h1>
          <p>Chọn ngẫu nhiên công bằng, chia đội nhanh và quản lý danh sách lớp trong một không gian rõ ràng, nhẹ mắt.</p>
        </div>
        <div className="rsp-google-hero-badges" aria-label="Tính năng chính">
          <span><b>12</b> chế độ</span>
          <span><b>0</b> API</span>
          <span><b>100%</b> cục bộ</span>
        </div>
      </section>

      <RandomStudentPicker
        currentUser={currentUser}
        onClose={() => { window.location.hash = '#/apps'; }}
      />
    </div>
  );
}
