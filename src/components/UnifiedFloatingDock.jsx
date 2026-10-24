import React, { useEffect, useRef, useState } from 'react';
import { MoonStar, ShieldCheck, Sparkles, X } from 'lucide-react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { isSupabaseConfigured } from '../utils/supabase.js';
import { GLOBAL_FLOATING_STATUS_EVENT, FLOATING_ACTION_IDS, openUnifiedFloatingAction } from '../utils/unifiedFloatingDock.js';
import './UnifiedFloatingDock.css';

/** Single floating trigger; existing app components retain all business logic. */
export default function UnifiedFloatingDock({ currentUser, language = 'vi', showFocus = true, showApprovals = true, showChat = true, triggerRef }) {
  const vi = language !== 'en';
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(0);
  const rootRef = useRef(null);
  const canReview = Boolean(showApprovals && isSupabaseConfigured && currentUser?.id &&
    currentUser?.approved === true && isDepartmentLeaderRole(currentUser.role));
  const actions = [
    ...(showFocus ? [{ id: FLOATING_ACTION_IDS.focus, label: vi ? 'Màn hình tập trung' : 'Brian Focus', Icon: MoonStar }] : []),
    ...(canReview ? [{ id: FLOATING_ACTION_IDS.approvals, label: vi ? 'Duyệt quyền truy cập' : 'Access approvals', Icon: ShieldCheck }] : []),
    ...(showChat ? [{ id: FLOATING_ACTION_IDS.chat, label: 'Brian AI', Icon: Sparkles }] : []),
  ];
  useEffect(() => { setExpanded(false); setPending(0); }, [currentUser?.id]);
  useEffect(() => {
    const update = event => {
      if (event.detail?.id === FLOATING_ACTION_IDS.approvals)
        setPending(Math.max(0, Math.min(999, Number(event.detail.pending) || 0)));
    };
    window.addEventListener(GLOBAL_FLOATING_STATUS_EVENT, update);
    return () => window.removeEventListener(GLOBAL_FLOATING_STATUS_EVENT, update);
  }, []);
  useEffect(() => {
    if (!expanded) return undefined;
    const outside = event => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setExpanded(false);
    };
    const escape = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setExpanded(false);
        triggerRef?.current?.focus?.({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', escape, true);
    };
  }, [expanded, triggerRef]);
  if (!actions.length) return null;
  const select = id => {
    setExpanded(false);
    openUnifiedFloatingAction(id);
  };
  return <div ref={rootRef} className={`bes-unified-dock${expanded ? ' is-expanded' : ''}`}
    data-bes-unified-floating-dock data-expanded={expanded ? 'true' : 'false'}>
    <div id="bes-unified-dock-menu" className="bes-unified-dock__actions"
      role="group" aria-label={vi ? 'Các tiện ích nhanh' : 'Quick tools'} aria-hidden={!expanded}>
      {actions.map(({ id, label, Icon }, index) => <button type="button"
        key={id} className={`bes-unified-dock__action is-${id}`}
        style={{ '--bes-dock-order': index }}
        aria-label={label} title={label} disabled={!expanded} tabIndex={expanded ? 0 : -1}
        onClick={() => select(id)}>
        <Icon size={23} strokeWidth={1.8} aria-hidden="true"/>
        {id === FLOATING_ACTION_IDS.approvals && pending > 0 ? <span className="bes-unified-dock__badge"
          aria-label={vi ? `${pending} yêu cầu chờ duyệt` : `${pending} pending requests`}>{pending > 99 ? '99+' : pending}</span> : null}
        <span className="bes-unified-dock__tooltip" aria-hidden="true">{label}</span>
      </button>)}
    </div>
    <button id="bfc-focus-trigger" ref={triggerRef} type="button"
      className="bes-unified-dock__trigger"
      aria-expanded={expanded} aria-controls="bes-unified-dock-menu"
      aria-label={expanded ? (vi ? 'Thu gọn các nút tiện ích' : 'Collapse quick actions') :
        (vi ? 'Mở các nút tiện ích' : 'Expand quick actions')}
      onClick={() => setExpanded(value => !value)}>
      {expanded ? <X size={25} strokeWidth={1.8} aria-hidden="true"/> :
        <Sparkles size={27} strokeWidth={1.7} aria-hidden="true"/>}
      {!expanded && pending > 0 && canReview ? <span className="bes-unified-dock__badge is-trigger"
        aria-label={vi ? `${pending} yêu cầu chờ duyệt` : `${pending} pending requests`}>{pending > 99 ? '99+' : pending}</span> : null}
      <span className="bes-unified-dock__online" aria-hidden="true"/>
    </button>
  </div>;
}
