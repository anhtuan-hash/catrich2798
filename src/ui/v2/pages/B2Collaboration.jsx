import React, { useEffect, useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2DataState, B2Status } from '../components/B2Data.jsx';
import { useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import { COLLABORATION_UPDATED, loadCollaborationState } from '../../../utils/collaborationGovernance.js';
import './B2SystemWorkspaces.css';

const openV1 = () => window.open('/#/collaboration-hub', '_blank', 'noopener,noreferrer');
const empty = { spaces: [], members: [], threads: [], comments: [], versions: [], permissions: [], mode: 'empty' };
const safeArray = (value) => Array.isArray(value) ? value : [];

export default function B2Collaboration() {
  const { user } = useBrianV2Data();
  const [state, setState] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user?.id) { if (active) { setState(empty); setLoading(false); } return; }
      setLoading(true); setError('');
      try {
        const result = await loadCollaborationState(user);
        if (active) setState(result || empty);
      } catch (reason) {
        if (active) setError(reason?.message || String(reason));
      } finally { if (active) setLoading(false); }
    };
    load();
    const refresh = () => load();
    window.addEventListener(COLLABORATION_UPDATED, refresh);
    return () => { active = false; window.removeEventListener(COLLABORATION_UPDATED, refresh); };
  }, [user]);

  const spaces = safeArray(state.spaces);
  const members = safeArray(state.members);
  const threads = safeArray(state.threads);
  const comments = safeArray(state.comments);
  const versions = safeArray(state.versions);
  const openThreads = threads.filter((item) => !['resolved','closed','archived'].includes(String(item.status||'').toLowerCase()));
  const recentThreads = useMemo(() => [...threads].sort((a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''))).slice(0,12), [threads]);

  return <>
    <B2PageHeader eyebrow="WORK · COLLABORATION" title="Không gian cộng tác" description="Metro Next đọc Collaboration Governance hiện hữu. Cloud/local fallback và RLS vẫn do engine V1 quyết định; các lệnh tạo project, thành viên, thread và version tiếp tục chạy ở V1 trong giai đoạn read-first." actions={<B2Button variant="primary" onClick={openV1}>Mở Collaboration Hub V1 ↗</B2Button>} aside={<B2Badge tone={state.mode==='cloud'?'green':'blue'}>{state.mode==='cloud'?'LIVE CLOUD':state.mode==='local'?'LOCAL FALLBACK':'NO DATA'}</B2Badge>} />
    <section className="b2-system-stats"><B2StatCard label="Không gian" value={spaces.length} meta="spaces khả dụng" tone="blue" icon="▦"/><B2StatCard label="Thành viên" value={members.length} meta="membership rows" tone="green" icon="◎"/><B2StatCard label="Thread đang mở" value={openThreads.length} meta="discussion / review" tone="violet" icon="◇"/><B2StatCard label="Phiên bản" value={versions.length} meta="content versions" tone="cyan" icon="▤"/></section>
    <section className="b2-system-grid"><div className="b2-system-stack"><div><B2SectionHeader eyebrow="SPACES" title="Không gian hiện có" description={`${spaces.length} không gian từ Collaboration Governance.`}/>{loading?<B2DataState type="loading"/>:error?<B2DataState type="error" title="Không đọc được Collaboration" description={error}/>:spaces.length?<div className="b2-system-list">{spaces.slice(0,10).map((space)=><article key={space.id} className="b2-system-row"><div className="b2-system-row__copy"><strong>{space.title||'Không gian chưa đặt tên'}</strong><small>{space.description||space.space_type||'Không có mô tả'}</small><em>{space.visibility||'restricted'} · {space.status||'active'}</em></div><B2Status tone={space.status==='active'?'green':'blue'}>{space.status||'active'}</B2Status></article>)}</div>:<div className="b2-system-empty"><div><strong>Chưa có không gian cộng tác</strong><p>Không tạo project mẫu trong Shadow UI.</p></div></div>}</div><div><B2SectionHeader eyebrow="THREADS" title="Thảo luận gần đây" description={`${comments.length} bình luận đang được cache/đọc.`}/>{recentThreads.length?<div className="b2-system-list">{recentThreads.map((thread)=><article key={thread.id} className="b2-system-row"><div className="b2-system-thread"><span>{String(thread.thread_type||'TH').slice(0,2).toUpperCase()}</span><div><strong>{thread.title||'Thread chưa đặt tên'}</strong><small>{thread.thread_type||'discussion'} · {thread.status||'open'}</small></div></div><B2Badge tone={['resolved','closed'].includes(thread.status)?'green':'violet'}>{thread.status||'open'}</B2Badge></article>)}</div>:<div className="b2-system-empty"><div><strong>Chưa có thread</strong></div></div>}</div></div><aside className="b2-system-stack"><B2Surface><B2SectionHeader eyebrow="WRITE COMMANDS" title="Tác vụ cộng tác"/><div className="b2-system-action-list"><button onClick={openV1}><span>＋</span><strong>Tạo không gian</strong><em>↗</em></button><button onClick={openV1}><span>◎</span><strong>Thêm thành viên</strong><em>↗</em></button><button onClick={openV1}><span>◇</span><strong>Tạo thảo luận</strong><em>↗</em></button><button onClick={openV1}><span>▤</span><strong>Quản lý phiên bản</strong><em>↗</em></button></div></B2Surface><B2Surface><B2SectionHeader eyebrow="GOVERNANCE" title="Trạng thái đọc"/><div className="b2-system-source"><B2Badge tone={state.mode==='cloud'?'green':'blue'}>{state.mode||'empty'}</B2Badge><B2Badge>{safeArray(state.permissions).length} permission overrides</B2Badge></div></B2Surface></aside></section>
  </>;
}
