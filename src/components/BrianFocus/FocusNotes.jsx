import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Clipboard, FilePlus2, LoaderCircle, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../utils/supabase.js';

const FIELDS = 'id,user_id,title,body,is_done,updated_at';

export default function FocusNotes({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const pending = useRef(new Map());
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const selected = notes.find(note => note.id === selectedId);

  const persist = async (note) => {
    if (!note || !supabase) return;
    const { error } = await supabase.from('brian_focus_notes')
      .update({ title: note.title.slice(0,120), body: note.body.slice(0,5000),
        is_done: Boolean(note.is_done), updated_at: new Date().toISOString() })
      .eq('id', note.id).eq('user_id', currentUser.id);
    if (error) setStatus(error.message);
    else setStatus(vi ? 'Đã lưu' : 'Saved');
  };
  const flush = id => {
    const timer = pending.current.get(id);
    if (timer) clearTimeout(timer);
    pending.current.delete(id);
    const note = notesRef.current.find(item => item.id === id);
    if (note) persist(note).catch(error => setStatus(error.message));
  };
  const edit = changes => {
    if (!selected) return;
    const next = { ...selected, ...changes };
    setNotes(previous => previous.map(note => note.id === next.id ? next : note));
    notesRef.current = notesRef.current.map(note => note.id === next.id ? next : note);
    setStatus(vi ? 'Đang lưu…' : 'Saving…');
    if (pending.current.has(next.id)) clearTimeout(pending.current.get(next.id));
    pending.current.set(next.id, window.setTimeout(() => flush(next.id), 650));
  };
  useEffect(() => {
    let active = true;
    setNotes([]);
    setSelectedId('');
    setStatus('');
    setLoading(true);
    if (!isSupabaseConfigured || !supabase || !currentUser?.id) {
      setStatus(vi ? 'Cần đăng nhập để lưu ghi chú riêng tư.' : 'Sign in to save private notes.');
      setLoading(false);
      return undefined;
    }
    supabase.from('brian_focus_notes').select(FIELDS).eq('user_id', currentUser.id)
      .order('updated_at', { ascending: false }).limit(30)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setStatus(error.message);
        else {
          setNotes(data || []);
          setSelectedId(data?.[0]?.id || '');
        }
        setLoading(false);
      });
    return () => {
      active = false;
      for (const timer of pending.current.values()) clearTimeout(timer);
      pending.current.clear();
    };
  }, [currentUser?.id, vi]);
  const add = async () => {
    if (!supabase || !currentUser?.id || notes.length >= 30) return;
    setStatus(vi ? 'Đang tạo…' : 'Creating…');
    const { data, error } = await supabase.from('brian_focus_notes')
      .insert({ user_id: currentUser.id, title: vi ? 'Ghi chú mới' : 'New note', body: '' })
      .select(FIELDS).single();
    if (error) { setStatus(error.message); return; }
    setNotes(previous => [data, ...previous]);
    setSelectedId(data.id);
    setStatus(vi ? 'Đã tạo' : 'Created');
  };
  const remove = async () => {
    if (!selected || !supabase || !window.confirm(vi ? 'Xóa ghi chú này?' : 'Delete this note?')) return;
    const id = selected.id;
    if (pending.current.has(id)) clearTimeout(pending.current.get(id));
    pending.current.delete(id);
    const { error } = await supabase.from('brian_focus_notes').delete()
      .eq('id', id).eq('user_id', currentUser.id);
    if (error) { setStatus(error.message); return; }
    const next = notes.filter(note => note.id !== id);
    setNotes(next);
    setSelectedId(next[0]?.id || '');
    setStatus(vi ? 'Đã xóa' : 'Deleted');
  };
  return <div className="bfc-notes">
    <div className="bfc-notes__toolbar">
      <strong>{vi ? 'Ghi chú cá nhân' : 'Private notes'}</strong>
      <button type="button" onClick={add} disabled={!currentUser?.id || loading || notes.length >= 30}>
        <FilePlus2 size={15}/>{vi ? 'Tạo mới' : 'New'}
      </button>
    </div>
    {loading ? <p className="bfc-workspace__muted"><LoaderCircle size={15} className="is-spinning"/> {vi ? 'Đang tải…' : 'Loading…'}</p> :
      <div className="bfc-notes__main">
        {notes.length > 0 && <div className="bfc-notes__list" aria-label={vi ? 'Danh sách ghi chú' : 'Notes list'}>
          {notes.map(note => <button type="button" key={note.id} aria-pressed={note.id === selectedId}
            onClick={() => { if (selectedId) flush(selectedId); setSelectedId(note.id); }}
            className={note.id === selectedId ? 'is-selected' : ''}>
            {note.is_done ? <CheckCircle2 size={14}/> : <Clipboard size={14}/>}
            <span>{note.title || (vi ? 'Không tiêu đề' : 'Untitled')}</span>
          </button>)}
        </div>}
        {selected ? <div className="bfc-notes__edit">
          <input aria-label={vi ? 'Tiêu đề ghi chú' : 'Note title'} maxLength={120} value={selected.title}
            onChange={event => edit({title:event.target.value})} onBlur={() => flush(selected.id)}/>
          <textarea aria-label={vi ? 'Nội dung ghi chú' : 'Note content'} maxLength={5000}
            rows={5} value={selected.body} placeholder={vi ? 'Ghi lại ý tưởng, công việc...' : 'Capture an idea or task...'}
            onChange={event => edit({body:event.target.value})} onBlur={() => flush(selected.id)}/>
          <div className="bfc-notes__actions">
            <label><input type="checkbox" checked={selected.is_done}
              onChange={event => edit({is_done:event.target.checked})}/>
              <Check size={14}/>{vi ? 'Hoàn thành' : 'Done'}</label>
            <button type="button" onClick={() => navigator.clipboard?.writeText(selected.title + '\n' + selected.body)}>
              <Clipboard size={14}/>{vi ? 'Sao chép' : 'Copy'}
            </button>
            <button type="button" className="is-danger" onClick={remove}><Trash2 size={14}/>{vi ? 'Xóa' : 'Delete'}</button>
          </div>
        </div> : <div className="bfc-notes__empty">{vi ? 'Tạo ghi chú đầu tiên để bắt đầu.' : 'Create your first note to start.'}</div>}
      </div>}
    <p className="bfc-notes__status" role="status">{status || (vi ? 'Chỉ tài khoản của bạn có quyền xem những ghi chú này.' : 'Only your account can read these notes.')}</p>
  </div>;
}
