import { useEffect } from 'react';

/* Legacy Settings styles use important background declarations. React writes the
   selected avatar preview as an inline background image, so promote that one
   inline declaration to important after each relevant DOM update. */
export default function GlobalUserProfilePreviewGuard() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const sync = () => {
      document.querySelectorAll('.bes-profile-editor__avatar.has-image').forEach((node) => {
        const value = node.style.getPropertyValue('background-image');
        if (value && node.style.getPropertyPriority('background-image') !== 'important') {
          node.style.setProperty('background-image', value, 'important');
        }
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
