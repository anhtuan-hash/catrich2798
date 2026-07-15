import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { downloadText, readLocal, scopedLocalKey, writeLocal } from './v1093/shared.js';
import { createTransfer, TRANSFER_APPLY_EVENT } from '../utils/contentTransfer.js';
import {
  ECOSYSTEM_ASSET_TYPES,
  ECOSYSTEM_RECIPES,
  ECOSYSTEM_TARGETS,
  dispatchRecipe,
  extractKeywords,
  makeCanvasBlocks,
  makeEcosystemAsset,
  serializeCanvas,
} from '../utils/contentEcosystem.js';

const TABS = [
  ['library', 'Thư viện tài sản', 'Asset library'],
  ['canvas', 'Canvas nội dung', 'Content canvas'],
  ['recipes', 'Dây chuyền sản xuất', 'Production recipes'],
  ['kits', 'Bộ nội dung', 'Content kits'],
];

function blankAsset() {
  return makeEcosystemAsset({ title: 'Nguồn nội dung mới', asset_type: 'source', content_text: '' });
}

function assetTypeLabel(value) {
  return ECOSYSTEM_ASSET_TYPES.find(([id]) => id === value)?.[1] || value;
}

function kitId() {
  return `kit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ContentEcosystem({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const vi = language === 'vi';
  const assetKey = scopedLocalKey('bes-content-ecosystem-assets-v1120', currentUser);
  const kitKey = scopedLocalKey('bes-content-ecosystem-kits-v1120', currentUser);
  const [tab, setTab] = useState('library');
  const [assets, setAssets] = useState([]);
  const [kits, setKits] = useState([]);
  const [activeAssetId, setActiveAssetId] = useState('');
  const [draft, setDraft] = useState(blankAsset);
  const [blocks, setBlocks] = useState(() => makeCanvasBlocks(''));
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [recipeId, setRecipeId] = useState(ECOSYSTEM_RECIPES[0].id);
  const [targets, setTargets] = useState(ECOSYSTEM_RECIPES[0].outputs);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const activeAsset = useMemo(() => assets.find((asset) => asset.id === activeAssetId) || null, [assets, activeAssetId]);
  const currentRecipe = useMemo(() => ECOSYSTEM_RECIPES.find((recipe) => recipe.id === recipeId) || ECOSYSTEM_RECIPES[0], [recipeId]);
  const filteredAssets = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return assets;
    return assets.filter((asset) => `${asset.title} ${asset.asset_type} ${(asset.tags || []).join(' ')} ${asset.content_text}`.toLowerCase().includes(keyword));
  }, [assets, query]);

  const persistLocal = useCallback((nextAssets, nextKits = kits) => {
    writeLocal(assetKey, nextAssets);
    writeLocal(kitKey, nextKits);
  }, [assetKey, kitKey, kits]);

  const loadData = useCallback(async () => {
    let loadedAssets = readLocal(assetKey, []);
    let loadedKits = readLocal(kitKey, []);
    if (client && runtime.session) {
      const [{ data: cloudAssets, error: assetError }, { data: cloudKits, error: kitError }] = await Promise.all([
        client.from('content_ecosystem_assets').select('*').order('updated_at', { ascending: false }).limit(500),
        client.from('content_ecosystem_kits').select('*').order('updated_at', { ascending: false }).limit(200),
      ]);
      if (!assetError) loadedAssets = (cloudAssets || []).map(makeEcosystemAsset);
      if (!kitError) loadedKits = cloudKits || [];
    }
    setAssets(loadedAssets);
    setKits(loadedKits);
    if (loadedAssets[0]) {
      setActiveAssetId(loadedAssets[0].id);
      setDraft(loadedAssets[0]);
      setBlocks(makeCanvasBlocks(loadedAssets[0].content_text));
    }
  }, [assetKey, client, kitKey, runtime.session]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const applyTransfer = (event) => {
      const item = event?.detail;
      if (!item || item.target !== 'content-ecosystem') return;
      const asset = makeEcosystemAsset({
        title: item.title,
        asset_type: item.type || 'source',
        source_app: item.sourceApp,
        content_text: item.content,
        metadata: item.metadata,
        tags: extractKeywords(item.content, 10),
      });
      setAssets((current) => {
        const next = [asset, ...current.filter((entry) => entry.id !== asset.id)];
        persistLocal(next);
        return next;
      });
      setActiveAssetId(asset.id);
      setDraft(asset);
      setBlocks(makeCanvasBlocks(asset.content_text));
      setTab('canvas');
      setNotice(vi ? 'Đã nhận nội dung từ ứng dụng khác.' : 'Content received from another app.');
    };
    window.addEventListener(TRANSFER_APPLY_EVENT, applyTransfer);
    return () => window.removeEventListener(TRANSFER_APPLY_EVENT, applyTransfer);
  }, [persistLocal, vi]);

  function openAsset(asset) {
    setActiveAssetId(asset.id);
    setDraft(asset);
    setBlocks(makeCanvasBlocks(asset.content_text));
    setTab('canvas');
  }

  function newAsset() {
    const asset = blankAsset();
    setActiveAssetId('');
    setDraft(asset);
    setBlocks(makeCanvasBlocks(''));
    setTab('canvas');
  }

  async function saveAsset() {
    if (!draft.title.trim()) { setError(vi ? 'Hãy đặt tên nội dung.' : 'Please name the content.'); return; }
    const asset = makeEcosystemAsset({
      ...draft,
      id: activeAssetId || draft.id,
      content_text: serializeCanvas(blocks),
      tags: draft.tags?.length ? draft.tags : extractKeywords(serializeCanvas(blocks), 12),
      updated_at: new Date().toISOString(),
    });
    setBusy(true); setError('');
    try {
      let saved = asset;
      if (client && runtime.session) {
        const payload = {
          id: asset.id,
          owner_id: currentUser.id,
          title: asset.title,
          asset_type: asset.asset_type,
          source_app: asset.source_app,
          content_text: asset.content_text,
          content_json: asset.content_json,
          metadata: asset.metadata,
          tags: asset.tags,
          status: asset.status,
          updated_at: asset.updated_at,
        };
        const { data, error: saveError } = await client.from('content_ecosystem_assets').upsert(payload).select('*').single();
        if (saveError) throw saveError;
        saved = makeEcosystemAsset(data);
      }
      const next = [saved, ...assets.filter((entry) => entry.id !== saved.id)];
      setAssets(next); setActiveAssetId(saved.id); setDraft(saved); persistLocal(next);
      setNotice(vi ? 'Đã lưu tài sản nội dung.' : 'Content asset saved.');
    } catch (saveError) { setError(saveError.message || String(saveError)); }
    finally { setBusy(false); }
  }

  async function deleteAsset(asset) {
    if (!window.confirm(vi ? `Xóa “${asset.title}”?` : `Delete “${asset.title}”?`)) return;
    if (client && runtime.session) await client.from('content_ecosystem_assets').delete().eq('id', asset.id);
    const next = assets.filter((entry) => entry.id !== asset.id);
    setAssets(next); setSelectedAssets((current) => current.filter((id) => id !== asset.id)); persistLocal(next);
    if (activeAssetId === asset.id) newAsset();
  }

  function updateBlock(id, patch) {
    setBlocks((current) => current.map((block) => block.id === id ? { ...block, ...patch } : block));
  }

  function addBlock() {
    setBlocks((current) => [...current, { id: `block-${Date.now()}`, type: 'section', title: `Khối ${current.length + 1}`, content: '', locked: false }]);
  }

  function moveBlock(index, direction) {
    setBlocks((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeBlock(id) {
    setBlocks((current) => current.length <= 1 ? current : current.filter((block) => block.id !== id));
  }

  function selectRecipe(id) {
    const recipe = ECOSYSTEM_RECIPES.find((entry) => entry.id === id) || ECOSYSTEM_RECIPES[0];
    setRecipeId(recipe.id);
    setTargets(recipe.outputs);
  }

  function runRecipe() {
    const asset = activeAsset || assets.find((entry) => selectedAssets.includes(entry.id)) || assets[0];
    if (!asset) { setError(vi ? 'Hãy tạo hoặc chọn một nguồn nội dung.' : 'Create or select a source asset first.'); return; }
    const results = dispatchRecipe(currentUser, asset, currentRecipe, targets);
    if (!results.length) { setError(vi ? 'Hãy chọn ít nhất một ứng dụng đích.' : 'Choose at least one destination app.'); return; }
    setNotice(vi ? `Đã tạo ${results.length} đầu việc trong dây chuyền. Mở từng ứng dụng để nhận nội dung.` : `${results.length} production tasks created. Open each app to receive the content.`);
  }

  async function createKit() {
    const chosen = assets.filter((asset) => selectedAssets.includes(asset.id));
    if (!chosen.length) { setError(vi ? 'Hãy chọn tài sản để tạo bộ nội dung.' : 'Select assets for the kit.'); return; }
    const title = window.prompt(vi ? 'Tên bộ nội dung:' : 'Content kit title:', `${chosen[0].title} · Kit`)?.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const kit = { id: kitId(), owner_id: currentUser.id, title, description: '', asset_ids: chosen.map((asset) => asset.id), status: 'draft', created_at: now, updated_at: now };
    let saved = kit;
    if (client && runtime.session) {
      const { data, error: saveError } = await client.from('content_ecosystem_kits').insert(kit).select('*').single();
      if (saveError) { setError(saveError.message); return; }
      saved = data;
    }
    const next = [saved, ...kits];
    setKits(next); persistLocal(assets, next); setTab('kits'); setNotice(vi ? 'Đã tạo bộ nội dung.' : 'Content kit created.');
  }

  function sendKitToWorksheetFactory(kit) {
    const chosen = assets.filter((asset) => (kit.asset_ids || []).includes(asset.id));
    const content = chosen
      .map((asset, index) => `${index + 1}. ${asset.title}\n${asset.content_text || ''}`)
      .join('\n\n');
    createTransfer(currentUser, {
      target: 'worksheet-factory',
      type: 'content-kit',
      title: kit.title,
      sourceApp: 'content-ecosystem',
      sourceTitle: 'Content Ecosystem',
      content,
      metadata: { assetIds: chosen.map((asset) => asset.id), ecosystemVersion: '12.30.0' },
    });
    setNotice(vi ? 'Đã gửi bộ nội dung sang Worksheet Factory.' : 'Content kit sent to Worksheet Factory.');
    window.setTimeout(() => { window.location.hash = '#/tool/worksheet-factory'; }, 350);
  }

  function exportKit(kit) {
    const chosen = assets.filter((asset) => (kit.asset_ids || []).includes(asset.id));
    downloadText(`${kit.title.replace(/[^a-z0-9_-]+/gi, '-')}.json`, JSON.stringify({ ...kit, assets: chosen }, null, 2), 'application/json;charset=utf-8');
  }

  return (
    <section className="v1120-page">
      <header className="v1120-hero">
        <div className="v1120-hero-mark">CE</div>
        <div>
          <span>FINAL CONTENT ECOSYSTEM · V11.2</span>
          <h1>{vi ? 'Hệ sinh thái nội dung dạy học' : 'Teaching Content Ecosystem'}</h1>
          <p>{vi ? 'Biến một nguồn thành nhiều sản phẩm, tái sử dụng giữa các ứng dụng và đóng gói thành một bài dạy hoàn chỉnh.' : 'Turn one source into reusable products across apps and package them into a complete lesson.'}</p>
        </div>
        <div className="v1120-hero-stats">
          <b>{assets.length}</b><small>{vi ? 'tài sản' : 'assets'}</small>
          <b>{kits.length}</b><small>{vi ? 'bộ nội dung' : 'kits'}</small>
          <b>{ECOSYSTEM_TARGETS.length}</b><small>{vi ? 'ứng dụng nối' : 'connected apps'}</small>
        </div>
      </header>

      <nav className="v1120-tabs" aria-label={vi ? 'Không gian hệ sinh thái' : 'Ecosystem spaces'}>
        {TABS.map(([id, labelVi, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{vi ? labelVi : label}</button>)}
      </nav>

      {notice ? <div className="v1120-notice success">✓ {notice}<button onClick={() => setNotice('')}>×</button></div> : null}
      {error ? <div className="v1120-notice error">! {error}<button onClick={() => setError('')}>×</button></div> : null}

      {tab === 'library' ? (
        <main className="v1120-library-layout">
          <aside className="v1120-side-panel">
            <button className="primary" onClick={newAsset}>＋ {vi ? 'Tạo tài sản' : 'New asset'}</button>
            <button onClick={createKit} disabled={!selectedAssets.length}>▣ {vi ? `Tạo bộ (${selectedAssets.length})` : `Create kit (${selectedAssets.length})`}</button>
            <label><span>{vi ? 'Tìm kiếm' : 'Search'}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={vi ? 'Tên, loại, thẻ hoặc nội dung…' : 'Title, type, tags or content…'} /></label>
            <div className="v1120-type-summary">
              {ECOSYSTEM_ASSET_TYPES.map(([id, label]) => <span key={id}><b>{assets.filter((asset) => asset.asset_type === id).length}</b>{label}</span>)}
            </div>
          </aside>
          <section className="v1120-assets">
            <div className="v1120-section-heading"><div><span>REUSABLE CONTENT</span><h2>{vi ? 'Tài sản có thể tái sử dụng' : 'Reusable assets'}</h2></div><small>{filteredAssets.length} {vi ? 'kết quả' : 'results'}</small></div>
            {filteredAssets.length ? <div className="v1120-asset-grid">{filteredAssets.map((asset) => (
              <article key={asset.id} className={selectedAssets.includes(asset.id) ? 'selected' : ''}>
                <label className="v1120-select"><input type="checkbox" checked={selectedAssets.includes(asset.id)} onChange={() => setSelectedAssets((current) => current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id])} /><span /></label>
                <div className="v1120-asset-type">{assetTypeLabel(asset.asset_type)}</div>
                <h3>{asset.title}</h3>
                <p>{asset.content_text.slice(0, 190) || (vi ? 'Chưa có nội dung.' : 'No content yet.')}</p>
                <div className="v1120-tags">{(asset.tags || []).slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
                <footer><small>{asset.source_app}</small><div><button onClick={() => openAsset(asset)}>{vi ? 'Mở' : 'Open'}</button><button onClick={() => deleteAsset(asset)}>×</button></div></footer>
              </article>
            ))}</div> : <div className="v1120-empty"><b>＋</b><h2>{vi ? 'Chưa có tài sản nội dung' : 'No content assets yet'}</h2><p>{vi ? 'Tạo mới hoặc gửi nội dung từ một ứng dụng khác vào Hệ sinh thái.' : 'Create one or send content here from another app.'}</p><button className="primary" onClick={newAsset}>{vi ? 'Tạo tài sản đầu tiên' : 'Create first asset'}</button></div>}
          </section>
        </main>
      ) : null}

      {tab === 'canvas' ? (
        <main className="v1120-canvas-layout">
          <aside className="v1120-canvas-meta">
            <span>STRUCTURED CANVAS</span><h2>{vi ? 'Biên tập theo khối' : 'Block-based editing'}</h2>
            <label><span>{vi ? 'Tên nội dung' : 'Title'}</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label><span>{vi ? 'Loại tài sản' : 'Asset type'}</span><select value={draft.asset_type} onChange={(event) => setDraft({ ...draft, asset_type: event.target.value })}>{ECOSYSTEM_ASSET_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <label><span>{vi ? 'Thẻ' : 'Tags'}</span><input value={(draft.tags || []).join(', ')} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} placeholder="B2, Unit 2, multiculturalism" /></label>
            <div className="v1120-canvas-actions"><button onClick={addBlock}>＋ {vi ? 'Thêm khối' : 'Add block'}</button><button className="primary" disabled={busy} onClick={saveAsset}>{busy ? '…' : (vi ? 'Lưu tài sản' : 'Save asset')}</button></div>
            <div className="v1120-keywords"><small>{vi ? 'Từ khóa tự phát hiện' : 'Detected keywords'}</small>{extractKeywords(serializeCanvas(blocks), 12).map((word) => <span key={word}>{word}</span>)}</div>
          </aside>
          <section className="v1120-canvas">
            {blocks.map((block, index) => <article key={block.id} className={block.locked ? 'locked' : ''}>
              <header><input value={block.title} disabled={block.locked} onChange={(event) => updateBlock(block.id, { title: event.target.value })} /><div><button onClick={() => moveBlock(index, -1)} disabled={index === 0}>↑</button><button onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1}>↓</button><button className={block.locked ? 'active' : ''} onClick={() => updateBlock(block.id, { locked: !block.locked })}>{block.locked ? '🔒' : '🔓'}</button><button onClick={() => removeBlock(block.id)}>×</button></div></header>
              <textarea data-transfer-target={index === 0 ? 'primary' : undefined} value={block.content} disabled={block.locked} onChange={(event) => updateBlock(block.id, { content: event.target.value })} placeholder={vi ? 'Nhập nội dung cho khối này…' : 'Enter block content…'} />
            </article>)}
          </section>
        </main>
      ) : null}

      {tab === 'recipes' ? (
        <main className="v1120-recipe-layout">
          <aside className="v1120-recipes">
            <span>ONE SOURCE → MANY OUTPUTS</span><h2>{vi ? 'Chọn dây chuyền' : 'Choose a recipe'}</h2>
            {ECOSYSTEM_RECIPES.map((recipe) => <button key={recipe.id} className={recipeId === recipe.id ? 'active' : ''} onClick={() => selectRecipe(recipe.id)}><b>{vi ? recipe.titleVi : recipe.title}</b><small>{vi ? recipe.descriptionVi : recipe.description}</small></button>)}
          </aside>
          <section className="v1120-pipeline">
            <div className="v1120-section-heading"><div><span>PRODUCTION PIPELINE</span><h2>{vi ? currentRecipe.titleVi : currentRecipe.title}</h2><p>{vi ? currentRecipe.descriptionVi : currentRecipe.description}</p></div><button className="primary" onClick={runRecipe}>{vi ? 'Tạo dây chuyền' : 'Create pipeline'} →</button></div>
            <div className="v1120-source-picker"><label><span>{vi ? 'Nguồn đang dùng' : 'Active source'}</span><select value={activeAssetId} onChange={(event) => { const asset = assets.find((entry) => entry.id === event.target.value); if (asset) openAsset(asset); setTab('recipes'); }}>{assets.length ? assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.title}</option>) : <option value="">{vi ? 'Chưa có nguồn' : 'No source'}</option>}</select></label></div>
            <div className="v1120-target-grid">{ECOSYSTEM_TARGETS.map((target) => <label key={target.id} className={targets.includes(target.id) ? 'selected' : ''}><input type="checkbox" checked={targets.includes(target.id)} onChange={() => setTargets((current) => current.includes(target.id) ? current.filter((id) => id !== target.id) : [...current, target.id])} /><span>{target.icon}</span><b>{target.label}</b><small>{targets.includes(target.id) ? (vi ? 'Sẽ tạo' : 'Will create') : (vi ? 'Bỏ qua' : 'Skip')}</small></label>)}</div>
            <div className="v1120-pipeline-note"><b>{vi ? 'Cách hoạt động' : 'How it works'}</b><p>{vi ? 'Hệ thống tạo các gói chuyển có cấu trúc. Khi mở từng ứng dụng đích, thầy chọn “Dùng nội dung” để tiếp tục biên tập bằng công cụ chuyên biệt.' : 'The system creates structured transfers. Open each destination app and choose “Use content” to continue editing with its specialist tools.'}</p></div>
          </section>
        </main>
      ) : null}

      {tab === 'kits' ? (
        <main className="v1120-kits">
          <div className="v1120-section-heading"><div><span>CONNECTED CONTENT KITS</span><h2>{vi ? 'Bộ nội dung hoàn chỉnh' : 'Complete content kits'}</h2><p>{vi ? 'Gom nhiều tài sản thành một bộ có thể tiếp tục biên tập trong Worksheet Factory.' : 'Bundle assets and continue editing the kit in Worksheet Factory.'}</p></div><button onClick={() => setTab('library')}>{vi ? 'Chọn tài sản' : 'Select assets'}</button></div>
          {kits.length ? <div className="v1120-kit-grid">{kits.map((kit) => {
            const chosen = assets.filter((asset) => (kit.asset_ids || []).includes(asset.id));
            return <article key={kit.id}><div className="v1120-kit-icon">KIT</div><h3>{kit.title}</h3><p>{chosen.length} {vi ? 'tài sản' : 'assets'} · {chosen.map((asset) => assetTypeLabel(asset.asset_type)).join(' · ')}</p><ul>{chosen.slice(0, 6).map((asset) => <li key={asset.id}>{asset.title}</li>)}</ul><footer><button onClick={() => exportKit(kit)}>JSON</button><button className="primary" onClick={() => sendKitToWorksheetFactory(kit)}>{vi ? 'Gửi Worksheet Factory' : 'Send to Worksheet Factory'} →</button></footer></article>;
          })}</div> : <div className="v1120-empty"><b>▣</b><h2>{vi ? 'Chưa có bộ nội dung' : 'No content kits yet'}</h2><p>{vi ? 'Chọn nhiều tài sản trong tab Thư viện rồi bấm “Tạo bộ”.' : 'Select multiple assets in Library, then choose “Create kit”.'}</p></div>}
        </main>
      ) : null}
    </section>
  );
}
