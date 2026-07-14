import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { formatDate, isLeader, uid } from './v1093/shared.js';
import {
  addCollaborationMember,
  addThreadComment,
  createCollaborationSpace,
  createContentVersion,
  createThread,
  loadCollaborationState,
  loadPeople,
  resolveThread,
  subscribeCollaboration,
  subscribeSpacePresence,
} from '../utils/collaborationGovernance.js';

const TYPES = [
  ['project', 'Dự án'], ['department_plan', 'Kế hoạch tổ'], ['lesson_study', 'Nghiên cứu bài học'],
  ['assessment', 'Xây dựng đề'], ['resource_collection', 'Biên soạn học liệu'], ['homeroom', 'Chủ nhiệm'], ['event', 'Sự kiện'],
];
const ROLES = [['viewer', 'Người xem'], ['member', 'Thành viên'], ['editor', 'Biên tập'], ['manager', 'Điều phối']];

function emptySpace() { return { title: '', description: '', space_type: 'project', visibility: 'restricted', color: '#315fc4' }; }
function emptyThread() { return { title: '', thread_type: 'discussion' }; }

export default function CollaborationHub({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const leader = isLeader(currentUser);
  const [state, setState] = useState({ spaces: [], members: [], threads: [], comments: [], versions: [], permissions: [], mode: 'local' });
  const [people, setPeople] = useState([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [tab, setTab] = useState('discussion');
  const [query, setQuery] = useState('');
  const [spaceDraft, setSpaceDraft] = useState(emptySpace);
  const [threadDraft, setThreadDraft] = useState(emptyThread);
  const [memberDraft, setMemberDraft] = useState({ user_id: '', member_role: 'member' });
  const [comment, setComment] = useState('');
  const [versionDraft, setVersionDraft] = useState({ title: '', content: '', status: 'draft' });
  const [presence, setPresence] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [next, profiles] = await Promise.all([loadCollaborationState(currentUser), loadPeople()]);
      setState(next); setPeople(profiles);
      setSelectedSpaceId((current) => current || next.spaces[0]?.id || '');
    } catch (loadError) { setError(loadError?.message || String(loadError)); }
  }, [currentUser?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeCollaboration(currentUser, load), [currentUser?.id, load]);
  useEffect(() => {
    setPresence([]);
    if (!selectedSpaceId) return undefined;
    return subscribeSpacePresence(selectedSpaceId, currentUser, setPresence);
  }, [selectedSpaceId, currentUser?.id]);

  const spaces = useMemo(() => state.spaces.filter((space) => `${space.title} ${space.description}`.toLowerCase().includes(query.trim().toLowerCase())), [state.spaces, query]);
  const selectedSpace = state.spaces.find((space) => space.id === selectedSpaceId) || null;
  const members = state.members.filter((member) => member.space_id === selectedSpaceId && member.status !== 'removed');
  const threads = state.threads.filter((thread) => thread.space_id === selectedSpaceId);
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) || threads[0] || null;
  const comments = state.comments.filter((entry) => entry.thread_id === selectedThread?.id);
  const versions = state.versions.filter((version) => version.space_id === selectedSpaceId);
  const canManage = leader || selectedSpace?.owner_id === currentUser?.id || members.some((member) => member.user_id === currentUser?.id && ['owner', 'manager'].includes(member.member_role));

  useEffect(() => {
    if (threads.length && !threads.some((thread) => thread.id === selectedThreadId)) setSelectedThreadId(threads[0].id);
    if (!threads.length) setSelectedThreadId('');
  }, [selectedSpaceId, threads.length]);

  const run = async (operation, message) => {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); setNotice(message); await load(); }
    catch (actionError) { setError(actionError?.message || String(actionError)); }
    finally { setBusy(false); }
  };

  const submitSpace = (event) => {
    event.preventDefault();
    if (!spaceDraft.title.trim()) return;
    run(async () => {
      const created = await createCollaborationSpace(spaceDraft, currentUser);
      setSpaceDraft(emptySpace()); setSelectedSpaceId(created.id);
    }, 'Đã tạo không gian cộng tác.');
  };

  const submitThread = (event) => {
    event.preventDefault();
    if (!selectedSpace || !threadDraft.title.trim()) return;
    run(async () => {
      const created = await createThread({ ...threadDraft, space_id: selectedSpace.id }, currentUser);
      setThreadDraft(emptyThread()); setSelectedThreadId(created.id);
    }, 'Đã tạo cuộc thảo luận.');
  };

  const submitComment = (event) => {
    event.preventDefault();
    if (!selectedSpace || !selectedThread || !comment.trim()) return;
    run(async () => {
      await addThreadComment({ space_id: selectedSpace.id, thread_id: selectedThread.id, body: comment }, currentUser, people);
      setComment('');
    }, 'Đã gửi phản hồi.');
  };

  const submitMember = (event) => {
    event.preventDefault();
    const person = people.find((entry) => entry.id === memberDraft.user_id);
    if (!selectedSpace || !person) return;
    run(async () => {
      await addCollaborationMember({ space_id: selectedSpace.id, user_id: person.id, member_role: memberDraft.member_role, display_name: person.name, email: person.email }, currentUser);
      setMemberDraft({ user_id: '', member_role: 'member' });
    }, 'Đã thêm thành viên.');
  };

  const submitVersion = (event) => {
    event.preventDefault();
    if (!selectedSpace || !versionDraft.title.trim()) return;
    const entityId = selectedSpace.id;
    run(async () => {
      await createContentVersion({ space_id: selectedSpace.id, entity_type: 'collaboration_space', entity_id: entityId, title: versionDraft.title, content: { text: versionDraft.content }, status: versionDraft.status }, currentUser);
      setVersionDraft({ title: '', content: '', status: 'draft' });
    }, 'Đã lưu phiên bản mới.');
  };

  const restoreVersion = (version) => run(() => createContentVersion({
    space_id: selectedSpace.id, entity_type: version.entity_type, entity_id: version.entity_id,
    title: `${version.title} · Khôi phục`, content: version.content, status: 'draft', restore_of: version.id,
  }, currentUser), `Đã tạo bản khôi phục từ phiên bản ${version.version_no}.`);

  return <section className="v1098-page v1098-collaboration">
    <header className="v1098-hero collaboration">
      <div><span>COLLABORATION · V10.98</span><h1>Không gian cộng tác</h1><p>Dự án, thành viên, bình luận, phiên bản và hiện diện Realtime trong một nơi.</p></div>
      <div className="v1098-runtime"><b>{runtime.ready ? 'Đã kết nối' : 'Đang kết nối'}</b><span>{state.mode === 'cloud' ? 'Supabase Realtime' : 'Local fallback'}</span></div>
    </header>

    {error && <div className="v1098-alert error"><b>!</b><span>{error}</span><button onClick={() => setError('')}>×</button></div>}
    {notice && <div className="v1098-alert success"><b>✓</b><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}

    <div className="v1098-collab-layout">
      <aside className="v1098-space-sidebar">
        <div className="v1098-sidebar-heading"><div><span>KHÔNG GIAN</span><h2>{state.spaces.length} dự án</h2></div><button onClick={load}>↻</button></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm không gian…" />
        <div className="v1098-space-list">{spaces.map((space) => <button key={space.id} className={space.id === selectedSpaceId ? 'active' : ''} onClick={() => { setSelectedSpaceId(space.id); setTab('discussion'); }}><i style={{ background: space.metadata?.color || '#315fc4' }} /><span><b>{space.title}</b><small>{TYPES.find(([id]) => id === space.space_type)?.[1] || space.space_type}</small></span><em>{state.threads.filter((thread) => thread.space_id === space.id && thread.status !== 'resolved').length}</em></button>)}</div>
        <form className="v1098-create-space" onSubmit={submitSpace}>
          <h3>+ Tạo không gian</h3>
          <input value={spaceDraft.title} onChange={(e) => setSpaceDraft({ ...spaceDraft, title: e.target.value })} placeholder="Tên dự án" />
          <textarea value={spaceDraft.description} onChange={(e) => setSpaceDraft({ ...spaceDraft, description: e.target.value })} placeholder="Mục tiêu và phạm vi" />
          <select value={spaceDraft.space_type} onChange={(e) => setSpaceDraft({ ...spaceDraft, space_type: e.target.value })}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          {leader && <select value={spaceDraft.visibility} onChange={(e) => setSpaceDraft({ ...spaceDraft, visibility: e.target.value })}><option value="restricted">Thành viên</option><option value="department">Toàn tổ</option><option value="private">Riêng tư</option></select>}
          <button disabled={busy || !spaceDraft.title.trim()}>Tạo không gian</button>
        </form>
      </aside>

      <main className="v1098-collab-main">
        {!selectedSpace ? <div className="v1098-empty"><b>Chưa có không gian cộng tác</b><span>Tạo dự án đầu tiên từ cột bên trái.</span></div> : <>
          <section className="v1098-space-head">
            <div><span>{TYPES.find(([id]) => id === selectedSpace.space_type)?.[1] || selectedSpace.space_type}</span><h2>{selectedSpace.title}</h2><p>{selectedSpace.description || 'Chưa có mô tả.'}</p></div>
            <div className="v1098-presence"><b>{presence.length}</b><span>đang trực tuyến</span><div>{presence.slice(0, 5).map((person) => <i key={person.id} title={person.name}>{String(person.name || 'U').slice(0, 1).toUpperCase()}</i>)}</div></div>
          </section>
          <nav className="v1098-tabs">{[['discussion', 'Thảo luận'], ['members', 'Thành viên'], ['versions', 'Phiên bản'], ['activity', 'Hoạt động']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>

          {tab === 'discussion' && <div className="v1098-discussion-grid">
            <section className="v1098-panel thread-list">
              <header><div><span>CHỦ ĐỀ</span><h3>{threads.length} cuộc thảo luận</h3></div></header>
              <form onSubmit={submitThread}><input value={threadDraft.title} onChange={(e) => setThreadDraft({ ...threadDraft, title: e.target.value })} placeholder="Tạo chủ đề mới…" /><select value={threadDraft.thread_type} onChange={(e) => setThreadDraft({ ...threadDraft, thread_type: e.target.value })}><option value="discussion">Thảo luận</option><option value="decision">Quyết định</option><option value="review">Góp ý</option><option value="question">Câu hỏi</option></select><button disabled={busy || !threadDraft.title.trim()}>Tạo</button></form>
              <div>{threads.map((thread) => <button key={thread.id} className={selectedThread?.id === thread.id ? 'active' : ''} onClick={() => setSelectedThreadId(thread.id)}><span className={`status ${thread.status}`}>{thread.status === 'resolved' ? 'Đã xử lý' : 'Đang mở'}</span><b>{thread.title}</b><small>{state.comments.filter((entry) => entry.thread_id === thread.id).length} phản hồi · {formatDate(thread.updated_at || thread.created_at)}</small></button>)}</div>
            </section>
            <section className="v1098-panel conversation">
              {!selectedThread ? <div className="v1098-empty"><b>Chưa có chủ đề</b><span>Tạo một cuộc thảo luận để bắt đầu.</span></div> : <>
                <header><div><span>{selectedThread.thread_type}</span><h3>{selectedThread.title}</h3></div><button disabled={busy} onClick={() => run(() => resolveThread(selectedThread, currentUser, selectedThread.status === 'resolved' ? 'open' : 'resolved'), selectedThread.status === 'resolved' ? 'Đã mở lại chủ đề.' : 'Đã đánh dấu chủ đề hoàn tất.')}>{selectedThread.status === 'resolved' ? 'Mở lại' : 'Đánh dấu hoàn tất'}</button></header>
                <div className="v1098-comment-list">{comments.map((entry) => <article key={entry.id}><i>{String(entry.author_name || 'U').slice(0, 1).toUpperCase()}</i><div><header><b>{entry.author_name || 'Thành viên'}</b><time>{formatDate(entry.created_at)}</time></header><p>{entry.body}</p>{entry.mentions?.length ? <small>@ Đã nhắc {entry.mentions.length} thành viên</small> : null}</div></article>)}</div>
                <form className="v1098-comment-form" onSubmit={submitComment}><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Phản hồi… Dùng @Tên để nhắc thành viên" /><button disabled={busy || !comment.trim()}>Gửi phản hồi</button></form>
              </>}
            </section>
          </div>}

          {tab === 'members' && <section className="v1098-panel v1098-members"><header><div><span>THÀNH VIÊN</span><h3>{members.length} người tham gia</h3></div></header>{canManage && <form onSubmit={submitMember}><select value={memberDraft.user_id} onChange={(e) => setMemberDraft({ ...memberDraft, user_id: e.target.value })}><option value="">Chọn tài khoản…</option>{people.filter((person) => !members.some((member) => member.user_id === person.id)).map((person) => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}</select><select value={memberDraft.member_role} onChange={(e) => setMemberDraft({ ...memberDraft, member_role: e.target.value })}>{ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button disabled={busy || !memberDraft.user_id}>Thêm thành viên</button></form>}<div className="v1098-member-grid">{members.map((member) => <article key={member.id}><i>{String(member.display_name || 'U').slice(0, 1).toUpperCase()}</i><div><b>{member.display_name || member.email}</b><small>{member.email || '—'}</small></div><span>{ROLES.find(([value]) => value === member.member_role)?.[1] || member.member_role}</span></article>)}</div></section>}

          {tab === 'versions' && <section className="v1098-panel v1098-versions"><header><div><span>LỊCH SỬ</span><h3>{versions.length} phiên bản</h3></div></header><form onSubmit={submitVersion}><input value={versionDraft.title} onChange={(e) => setVersionDraft({ ...versionDraft, title: e.target.value })} placeholder="Tên phiên bản" /><textarea value={versionDraft.content} onChange={(e) => setVersionDraft({ ...versionDraft, content: e.target.value })} placeholder="Nội dung hoặc ghi chú thay đổi" /><select value={versionDraft.status} onChange={(e) => setVersionDraft({ ...versionDraft, status: e.target.value })}><option value="draft">Bản nháp</option><option value="review">Chờ duyệt</option><option value="official">Chính thức</option></select><button disabled={busy || !versionDraft.title.trim()}>Lưu phiên bản</button></form><div className="v1098-version-list">{versions.map((version) => <article key={version.id}><strong>v{version.version_no}</strong><div><b>{version.title}</b><small>{version.status} · {formatDate(version.created_at)}</small><p>{version.content?.text || version.content?.value || 'Không có mô tả.'}</p></div><button onClick={() => restoreVersion(version)}>Khôi phục thành bản mới</button></article>)}</div></section>}

          {tab === 'activity' && <section className="v1098-panel"><header><div><span>DÒNG THỜI GIAN</span><h3>Hoạt động trong không gian</h3></div></header><div className="v1098-activity-feed">{[
            ...threads.map((item) => ({ id: `thread-${item.id}`, type: 'Chủ đề', title: item.title, at: item.created_at })),
            ...comments.map((item) => ({ id: `comment-${item.id}`, type: 'Bình luận', title: item.body, at: item.created_at })),
            ...versions.map((item) => ({ id: `version-${item.id}`, type: `Phiên bản ${item.version_no}`, title: item.title, at: item.created_at })),
          ].sort((a, b) => new Date(b.at) - new Date(a.at)).map((item) => <article key={item.id}><i>•</i><div><b>{item.type}</b><p>{item.title}</p></div><time>{formatDate(item.at)}</time></article>)}</div></section>}
        </>}
      </main>
    </div>
  </section>;
}
