import React, { useEffect, useState } from 'react';
import {
  CLOUD_SYNC_ENABLED, listAuthorizedEnglishClasses, savePilotSnapshot,
  loadPilotSnapshot, deletePilotSnapshot,
} from './cloudPilotApi.js';

export default function CloudPilotControls({currentUser,cohort,reviews,journal,onRestore}) {
  const [classes,setClasses] = useState([]);
  const [selectedClass,setSelectedClass] = useState('');
  const [authorized,setAuthorized] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');

  useEffect(() => {
    if (!CLOUD_SYNC_ENABLED) return undefined;
    let alive = true;
    listAuthorizedEnglishClasses(currentUser).then(rows=>{
      if(!alive)return;
      setClasses(rows);setSelectedClass(rows[0] || '');
    }).catch(e=>{ if(alive)setError(e.message); });
    return ()=>{alive=false;};
  },[currentUser?.id]);

  async function run(action) {
    if (!authorized) return setError('Confirm written school authorization before using cloud storage.');
    if (!selectedClass) return setError('Select an assigned English class.');
    if (busy) return;
    setBusy(true);setError('');setMessage('');
    try{
      if(action==='save'){
        if (!cohort.length) throw new Error('Import coded records before saving.');
        if (!window.confirm('Save coded learning records and activity metrics to Supabase? No names or narrative notes are included.')) return;
        const result=await savePilotSnapshot({user:currentUser,className:selectedClass,cohort,reviews,journal});
        setMessage('Encrypted-hosted study saved for assigned class at ' + result.updated_at + '. Narrative notes remain local.');
      } else if(action==='load'){
        if (!window.confirm('Replace this tab’s current records, reviews and activity log with the saved class snapshot? Export current evidence first.')) return;
        const result=await loadPilotSnapshot({user:currentUser,className:selectedClass});
        onRestore(result);
        setMessage('Coded study restored from cloud. Teacher notes were not stored.');
      } else if(action==='delete'){
        if(!window.confirm('Permanently delete the saved cloud snapshot for this class and school year?'))return;
        await deletePilotSnapshot({user:currentUser,className:selectedClass});
        setMessage('Saved cloud snapshot deleted. Current tab data remains available to export.');
      }
    }catch(e){setError(e.message || 'Cloud operation failed.');}
    finally{setBusy(false);}
  }

  return <section className="bew-cloud" aria-label="Optional cloud study storage">
    <div className="bew-cloud-top">
      <div><span className="bew-eyebrow">INSTITUTIONAL DATA GOVERNANCE</span><h3>Authorized cloud snapshot</h3></div>
      <span className={CLOUD_SYNC_ENABLED ? 'bew-cloud-ready' : 'bew-cloud-disabled'}>{CLOUD_SYNC_ENABLED ? 'Enabled by institution' : 'Not activated'}</span>
    </div>
    {!CLOUD_SYNC_ENABLED ? (
      <p>Cloud saving is off by default. The migration, assignment checks and RLS must be reviewed and approved by the school before this feature is enabled. You can use local CSV exports now.</p>
    ) : <>
      <p>Only pseudonymized scores, teacher decision codes and structured intervention events are saved. Original student IDs, names, links and free-text notes are never included.</p>
      <div className="bew-cloud-controls">
        <label htmlFor="bew-cloud-class">Verified English teaching class</label>
        <select id="bew-cloud-class" disabled={busy || !classes.length} value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>
          {!classes.length ? <option value="">No eligible class found</option> : classes.map(name=><option key={name} value={name}>{name}</option>)}
        </select>
      </div>
      <label className="bew-cloud-consent">
        <input type="checkbox" checked={authorized} onChange={e=>setAuthorized(e.target.checked)}/>
        I confirm that institutional approval and appropriate notice/authorization to process the coded study have been obtained.
      </label>
      <div className="bew-cloud-buttons">
        <button type="button" disabled={busy || !authorized || !selectedClass || !cohort.length} onClick={()=>run('save')}>Save coded snapshot</button>
        <button type="button" disabled={busy || !authorized || !selectedClass} onClick={()=>run('load')}>Restore from cloud</button>
        <button type="button" disabled={busy || !authorized || !selectedClass} onClick={()=>run('delete')}>Delete saved snapshot</button>
      </div>
      {message && <p className="bew-cloud-success" role="status">{message}</p>}
      {error && <p className="bew-journal-error" role="alert">{error}</p>}
    </>}
  </section>;
}
