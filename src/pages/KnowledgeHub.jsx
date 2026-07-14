import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { formatDate, isLeader } from './v1093/shared.js';

function normalizeResource(row) {
  const title = row.title || row.name || row.file_name || row.filename || 'Tài liệu chưa đặt tên';
  const description = row.description || row.summary || '';
  const uploader = row.uploader_name || row.owner_name || row.created_by_name || row.uploader_email || row.owner_email || '';
  const size = Number(row.size_bytes || row.file_size || row.size || 0);
  const status = String(row.status || 'approved').toLowerCase().trim();
  return { ...row, title, description, uploader, size, status };
}

function splitList(value) {
  return String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean);
}

export default function KnowledgeHub({ currentUser }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const leader = isLeader(currentUser);
  const [resources, setResources] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [userState, setUserState] = useState({});
  const [collections, setCollections] = useState([]);
  const [collectionItems, setCollectionItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [space, setSpace] = useState('all');
  const [cefr, setCefr] = useState('all');
  const [lifecycle, setLifecycle] = useState('all');
  const [view, setView] = useState('grid');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [metaDraft, setMetaDraft] = useState(null);

  const load = useCallback(async () => {
    if (!client || !runtime.ready || !runtime.session) return;
    setError('');
    const [{ data: resourceRows, error: resourceError }, { data: metaRows }, { data: stateRows }, { data: collectionRows }, { data: linkRows }] = await Promise.all([
      client.from('resource_items').select('*').order('updated_at', { ascending: false }).limit(1000),
      client.from('resource_smart_metadata').select('*').limit(1000),
      client.from('resource_user_state').select('*').eq('user_id', currentUser.id).limit(1000),
      client.from('resource_collections').select('*').order('updated_at', { ascending: false }).limit(300),
      client.from('resource_collection_items').select('*').limit(3000),
    ]);
    if (resourceError) { setError(resourceError.message); return; }
    setResources((resourceRows || []).map(normalizeResource));
    setMetadata(Object.fromEntries((metaRows || []).map((row) => [row.resource_id, row])));
    setUserState(Object.fromEntries((stateRows || []).map((row) => [row.resource_id, row])));
    setCollections(collectionRows || []);
    setCollectionItems(linkRows || []);
  }, [client, currentUser?.id, runtime.ready, runtime.session]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const cleanups = [
      subscribeTable({ key: `knowledge-resources-${currentUser?.id || 'guest'}`, table: 'resource_items', onChange: load }),
      subscribeTable({ key: `knowledge-metadata-${currentUser?.id || 'guest'}`, table: 'resource_smart_metadata', onChange: load }),
      subscribeTable({ key: `knowledge-state-${currentUser?.id || 'guest'}`, table: 'resource_user_state', onChange: load }),
    ];
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [currentUser?.id, load]);

  const selected = resources.find((item) => item.id === selectedId) || null;
  useEffect(() => {
    if (!selected) { setMetaDraft(null); return; }
    const meta = metadata[selected.id] || {};
    setMetaDraft({
      summary: meta.summary || selected.description || '', keywords: (meta.keywords || []).join(', '),
      skills: (meta.skills || []).join(', '), cefr_levels: (meta.cefr_levels || []).join(', '),
      units: (meta.units || []).join(', '), lifecycle_status: meta.lifecycle_status || 'active',
      quality_score: Number(meta.quality_score || 0), review_due_at: meta.review_due_at ? String(meta.review_due_at).slice(0, 10) : '',
    });
  }, [metadata, selected?.id]);

  const filtered = useMemo(() => resources.filter((resource) => {
    const meta = metadata[resource.id] || {};
    const state = userState[resource.id] || {};
    if (space === 'favorites' && !state.favorite) return false;
    if (space === 'recent' && !state.last_opened_at) return false;
    if (space === 'review' && meta.lifecycle_status !== 'needs_review') return false;
    if (space === 'duplicates' && !meta.duplicate_group) return false;
    if (cefr !== 'all' && !(meta.cefr_levels || []).includes(cefr)) return false;
    if (lifecycle !== 'all' && (meta.lifecycle_status || 'active') !== lifecycle) return false;
    const haystack = [resource.title, resource.description, resource.uploader, meta.summary,
      ...(meta.keywords || []), ...(meta.skills || []), ...(meta.cefr_levels || []), ...(meta.units || [])]
      .join(' ').toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [resources, metadata, userState, space, cefr, lifecycle, query]);

  const duplicateGroups = useMemo(() => {
    const groups = {};
    resources.forEach((resource) => {
      const fingerprint = metadata[resource.id]?.duplicate_group;
      if (!fingerprint) return;
      groups[fingerprint] = [...(groups[fingerprint] || []), resource.id];
    });
    return Object.values(groups).filter((ids) => ids.length > 1).flat();
  }, [resources, metadata]);

  async function toggleFavorite(resource) {
    const current = userState[resource.id] || {};
    const payload = { user_id: currentUser.id, resource_id: resource.id, favorite: !current.favorite, last_opened_at: current.last_opened_at || null, notes: current.notes || '', updated_at: new Date().toISOString() };
    const { data, error: stateError } = await client.from('resource_user_state').upsert(payload, { onConflict: 'user_id,resource_id' }).select('*').single();
    if (stateError) setError(stateError.message); else setUserState((state) => ({ ...state, [resource.id]: data }));
  }

  async function markOpened(resource) {
    setSelectedId(resource.id);
    const current = userState[resource.id] || {};
    const payload = { user_id: currentUser.id, resource_id: resource.id, favorite: Boolean(current.favorite), last_opened_at: new Date().toISOString(), notes: current.notes || '', updated_at: new Date().toISOString() };
    client.from('resource_user_state').upsert(payload, { onConflict: 'user_id,resource_id' }).select('*').single()
      .then(({ data }) => data && setUserState((state) => ({ ...state, [resource.id]: data })))
      .catch(() => {});
  }

  async function createCollection(event) {
    event.preventDefault();
    if (!collectionTitle.trim()) return;
    const payload = { owner_id: currentUser.id, title: collectionTitle.trim(), description: '', scope: leader ? 'department' : 'personal', color: 'blue' };
    const { data, error: collectionError } = await client.from('resource_collections').insert(payload).select('*').single();
    if (collectionError) setError(collectionError.message); else { setCollections((current) => [data, ...current]); setCollectionTitle(''); setNotice('Đã tạo bộ sưu tập.'); }
  }

  async function addToCollection(collectionId, resourceId) {
    const { error: linkError } = await client.from('resource_collection_items').upsert({ collection_id: collectionId, resource_id: resourceId, added_by: currentUser.id }, { onConflict: 'collection_id,resource_id' });
    if (linkError) setError(linkError.message); else { setCollectionItems((current) => [...current.filter((row) => !(row.collection_id === collectionId && row.resource_id === resourceId)), { collection_id: collectionId, resource_id: resourceId }]); setNotice('Đã thêm vào bộ sưu tập.'); }
  }

  async function saveMetadata(event) {
    event.preventDefault();
    if (!selected || !metaDraft) return;
    setBusy(true); setError('');
    const payload = {
      resource_id: selected.id, summary: metaDraft.summary.trim(), keywords: splitList(metaDraft.keywords), skills: splitList(metaDraft.skills),
      cefr_levels: splitList(metaDraft.cefr_levels).map((value) => value.toUpperCase()), units: splitList(metaDraft.units),
      lifecycle_status: metaDraft.lifecycle_status, quality_score: Number(metaDraft.quality_score || 0),
      review_due_at: metaDraft.review_due_at ? new Date(metaDraft.review_due_at).toISOString() : null,
      updated_by: currentUser.id, created_by: metadata[selected.id]?.created_by || currentUser.id,
    };
    const { data, error: metaError } = await client.from('resource_smart_metadata').upsert(payload, { onConflict: 'resource_id' }).select('*').single();
    if (metaError) setError(metaError.message); else { setMetadata((current) => ({ ...current, [selected.id]: data })); setNotice('Đã cập nhật metadata.'); }
    setBusy(false);
  }

  const averageQuality = resources.length ? Math.round(resources.reduce((sum, item) => sum + Number(metadata[item.id]?.quality_score || 0), 0) / resources.length) : 0;

  return <section className="v1093-page v1093-knowledge-hub bui-library" data-ui="library" data-library-app="knowledge-hub">
    <header className="v1093-hero v1093-hero-knowledge bui-library-header">
      <div><span className="v1093-kicker">V10.93 · Knowledge Core</span><h1>Kho học liệu thông minh</h1><p>Tìm kiếm, phân loại, bộ sưu tập và vòng đời tài liệu trong một nơi.</p></div>
      <button className="v1093-primary" onClick={() => window.location.hash = '#/resource-library'}>↑ Tải tài liệu</button>
    </header>
    {error && <div className="v1093-alert error"><b>Không thể tải kho học liệu</b><span>{error}</span><button onClick={load}>Thử lại</button></div>}
    {notice && <div className="v1093-alert success">{notice}</div>}

    <div className="v1093-search-row bui-library-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên, kỹ năng, CEFR, unit hoặc nội dung…" /><select value={cefr} onChange={(e) => setCefr(e.target.value)}><option value="all">Mọi CEFR</option>{['A1','A2','B1','B2','C1','C2'].map((value) => <option key={value}>{value}</option>)}</select><select value={lifecycle} onChange={(e) => setLifecycle(e.target.value)}><option value="all">Mọi vòng đời</option><option value="active">Đang sử dụng</option><option value="needs_review">Cần rà soát</option><option value="superseded">Đã thay thế</option><option value="archived">Lưu trữ</option></select><button onClick={() => setView(view === 'grid' ? 'list' : 'grid')}>{view === 'grid' ? '☷ Danh sách' : '▦ Thẻ lớn'}</button></div>

    <div className="v1093-metrics bui-library-metrics"><article><strong>{resources.length}</strong><span>Tài liệu có quyền truy cập</span></article><article><strong>{Object.keys(metadata).length}</strong><span>Đã có metadata</span></article><article><strong>{duplicateGroups.length}</strong><span>Cần kiểm tra trùng</span></article><article><strong>{averageQuality}%</strong><span>Điểm chất lượng TB</span></article></div>

    <div className="v1093-knowledge-layout bui-library-layout">
      <aside className="v1093-sidebar-card bui-library-navigation">
        {[['all','Tất cả'],['favorites','Yêu thích'],['recent','Gần đây'],['review','Cần rà soát'],['duplicates','Trùng lặp']].map(([value,label]) => <button key={value} className={space === value ? 'active' : ''} onClick={() => setSpace(value)}>{label}<span>{value === 'all' ? resources.length : value === 'favorites' ? Object.values(userState).filter((entry) => entry.favorite).length : value === 'recent' ? Object.values(userState).filter((entry) => entry.last_opened_at).length : value === 'review' ? Object.values(metadata).filter((entry) => entry.lifecycle_status === 'needs_review').length : duplicateGroups.length}</span></button>)}
        <form className="v1093-collection-form" onSubmit={createCollection}><label>Tạo bộ sưu tập</label><input value={collectionTitle} onChange={(e) => setCollectionTitle(e.target.value)} placeholder="Tên bộ sưu tập" /><button>+ Tạo</button></form>
        <div className="v1093-collection-list">{collections.map((collection) => <button key={collection.id} onClick={() => { setSpace('all'); setQuery(''); }}><span>▤</span><b>{collection.title}</b><small>{collectionItems.filter((row) => row.collection_id === collection.id).length}</small></button>)}</div>
      </aside>
      <section className={`v1093-resource-list bui-library-content ${view}`}>
        {filtered.map((resource) => {
          const meta = metadata[resource.id] || {};
          const state = userState[resource.id] || {};
          return <article key={resource.id} className="v1093-resource-card">
            <header><span className="v1093-file-type">{String(resource.mime_type || resource.file_type || 'FILE').split('/').pop().slice(0,5).toUpperCase()}</span><button className={state.favorite ? 'favorite' : ''} onClick={() => toggleFavorite(resource)}>★</button></header>
            <span className={`v1093-status status-${resource.status}`}>{resource.status === 'approved' ? 'Đã duyệt' : resource.status}</span>
            <h3>{resource.title}</h3><p>{meta.summary || resource.description || 'Chưa có mô tả.'}</p>
            <div className="v1093-tags">{(meta.cefr_levels || []).map((tag) => <span key={tag}>{tag}</span>)}{(meta.skills || []).slice(0,3).map((tag) => <span key={tag}>{tag}</span>)}</div>
            <footer><span>{resource.uploader || 'Không rõ người tải'}</span><button onClick={() => markOpened(resource)}>Mở chi tiết</button></footer>
          </article>;
        })}
        {!filtered.length && <div className="v1093-empty"><strong>Không tìm thấy tài liệu phù hợp</strong><span>Hãy đổi từ khóa hoặc xóa bớt bộ lọc.</span></div>}
      </section>
    </div>

    {selected && metaDraft && <div className="v1093-drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedId(''); }}><aside className="v1093-drawer v1093-resource-drawer"><button className="v1093-drawer-close" onClick={() => setSelectedId('')}>×</button><span className="v1093-kicker">Chi tiết học liệu</span><h2>{selected.title}</h2><p>{selected.description || 'Chưa có mô tả.'}</p><dl><div><dt>Người tải</dt><dd>{selected.uploader || '—'}</dd></div><div><dt>Cập nhật</dt><dd>{formatDate(selected.updated_at)}</dd></div><div><dt>Kích thước</dt><dd>{selected.size ? `${(selected.size / 1024 / 1024).toFixed(1)} MB` : '—'}</dd></div></dl>
      <form className="v1093-meta-form" onSubmit={saveMetadata}><label>Tóm tắt<textarea value={metaDraft.summary} onChange={(e) => setMetaDraft({ ...metaDraft, summary: e.target.value })} /></label><label>Từ khóa<input value={metaDraft.keywords} onChange={(e) => setMetaDraft({ ...metaDraft, keywords: e.target.value })} placeholder="environment, climate, unit 3" /></label><div className="v1093-form-grid"><label>Kỹ năng<input value={metaDraft.skills} onChange={(e) => setMetaDraft({ ...metaDraft, skills: e.target.value })} /></label><label>CEFR<input value={metaDraft.cefr_levels} onChange={(e) => setMetaDraft({ ...metaDraft, cefr_levels: e.target.value })} /></label><label>Unit<input value={metaDraft.units} onChange={(e) => setMetaDraft({ ...metaDraft, units: e.target.value })} /></label><label>Vòng đời<select value={metaDraft.lifecycle_status} onChange={(e) => setMetaDraft({ ...metaDraft, lifecycle_status: e.target.value })}><option value="draft">Bản nháp</option><option value="active">Đang sử dụng</option><option value="needs_review">Cần rà soát</option><option value="superseded">Đã thay thế</option><option value="archived">Lưu trữ</option></select></label><label>Điểm chất lượng<input type="number" min="0" max="100" value={metaDraft.quality_score} onChange={(e) => setMetaDraft({ ...metaDraft, quality_score: e.target.value })} /></label><label>Hạn rà soát<input type="date" value={metaDraft.review_due_at} onChange={(e) => setMetaDraft({ ...metaDraft, review_due_at: e.target.value })} /></label></div><button disabled={busy}>Lưu metadata</button></form>
      <section className="v1093-collection-actions"><h3>Thêm vào bộ sưu tập</h3>{collections.map((collection) => <button key={collection.id} disabled={collectionItems.some((row) => row.collection_id === collection.id && row.resource_id === selected.id)} onClick={() => addToCollection(collection.id, selected.id)}>{collection.title}</button>)}</section>
      <button className="v1093-secondary" onClick={() => window.dispatchEvent(new CustomEvent('bes-ai-open', { detail: { source: 'knowledge-hub', resource: selected } }))}>Gửi sang Brian AI</button>
    </aside></div>}
  </section>;
}
