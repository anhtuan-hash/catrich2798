import React, {useState} from 'react';
import {LockKeyhole,ShieldCheck,ShieldAlert,CheckCircle2} from 'lucide-react';
import EditorialHeading from '../shell/EditorialHeading.jsx';
import ContentPanel from '../shell/ContentPanel.jsx';
import {staffRequest as defaultTransport} from '../../v3/museumApi.js';

const tr = (lang, vi, en) => lang === 'en' ? en : vi;

// SettingsScreen — 07. Full Swiss layout. Toggles call the SAME server
// actions as v3/MuseumSettings (feature-settings / artwork-settings) with
// the same confirmation guards. Admin-only; non-admins see read-only state.
// Props: {language, data, staff, onRefresh, transport}.
export default function SettingsScreen({language='en', data, staff, onRefresh, transport=defaultTransport}) {
  const payload = data || staff || {};
  const isAdmin = payload?.profile?.role === 'admin';
  const creator = payload?.creatorSettings || {};
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const act = async (action, body) => {
    setBusy(true); setError(''); setMessage('');
    try {
      await transport(action, body);
      await onRefresh?.();
      setMessage(tr(language, 'Đã lưu thay đổi trên máy chủ.', 'Server changes saved.'));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const toggleCreatorPass = async () => {
    if (!isAdmin || busy) return;
    const next = !creator.enabled;
    if (next && !window.confirm(tr(language,
      'Chỉ bật Creator Pass sau khi đã kiểm thử đăng nhập nhóm và phân quyền Admin. Bạn có muốn bật không?',
      'Enable Creator Pass only after verifying group access and Admin permissions. Continue?'))) return;
    if (!next && !window.confirm(tr(language,
      'Tắt Creator Pass sẽ khóa truy cập phiên khách. Bạn muốn tiếp tục?',
      'Disabling Creator Pass will block guest access. Continue?'))) return;
    await act('feature-settings', {enabled: next});
  };

  const toggleArtwork = async () => {
    if (!isAdmin || busy || !creator.enabled) return;
    const enable = !creator.upload_enabled;
    if (enable && !window.confirm(tr(language,
      'Chỉ bật sau khi đã kiểm thử tải ảnh thật, quyền nhóm và thiết bị học sinh. Bạn xác nhận mở tải ảnh?',
      'Only enable after genuine media, group-scope and student-device QA. Confirm enable?'))) return;
    await act('artwork-settings', {enabled: enable});
  };

  const workflow = [
    {n:1, title: tr(language,'Phân công','Assign'), desc: tr(language,'Admin tạo bài tập và phát mã bí mật nhóm.','The Admin creates assignments and issues group passes.')},
    {n:2, title: tr(language,'Duyệt','Review'), desc: tr(language,'Admin chấm điểm và trực tiếp phê duyệt hoặc trả lại bài nộp.','The Admin scores and directly approves or returns submissions.')},
    {n:3, title: tr(language,'Công bố & quản lý','Publish and manage'), desc: tr(language,'Admin công bố bài đã duyệt và quản lý thao tác lưu trữ an toàn.','The Admin publishes approved work and manages safe archive actions.')},
  ];

  return (
    <>
      <EditorialHeading
        kicker={tr(language, 'QUẢN LÝ TRƯỜNG', 'SCHOOL MANAGEMENT')}
        title={tr(language, 'Cài đặt & phân quyền.', 'Settings & permissions.')}
        description={tr(language, 'Quyền truy cập đơn giản, vẫn bảo vệ nghiêm ngặt dữ liệu học sinh.', 'Simple permissions with strict student-data protection.')}
        aside={tr(language, 'Quyền truy cập & quy trình công bố', 'Access and publication workflow')}
      />

      {error ? <div className="info-strip mt20" role="alert" style={{background:'#fde8e8', borderLeftColor:'#b31c2d', color:'#7a1620'}}><ShieldAlert size={15} aria-hidden="true"/> {error}</div> : null}
      {message ? <div className="info-strip mt20" role="status"><CheckCircle2 size={15} aria-hidden="true"/> {message}</div> : null}

      <div className="settings-layout mt20">
        <ContentPanel ariaLabel={tr(language,'Học sinh không cần tài khoản','No student accounts')}>
          <h3><LockKeyhole size={24} aria-hidden="true" style={{verticalAlign:'middle', marginRight:8}}/> {tr(language,'Học sinh không cần tài khoản','No student accounts')}</h3>
          <p style={{fontSize:14, lineHeight:1.55, color:'#516272'}}>
            {tr(language,
              'Học sinh vào bằng mã QR và mã bí mật riêng cho nhóm. Không có quyền vào dữ liệu nội bộ của Brian.',
              'Students use a QR invitation plus a separate private group passcode; no Brian account is created.')}
          </p>
          <div className="setting-item">
            <div className="row">
              <span>Student Creator Pass</span>
              <span className={'toggle' + (creator.enabled ? '' : ' off')}>{creator.enabled ? 'ON' : 'OFF'}</span>
            </div>
            <p>{tr(language,'Cho phép nhóm mở Studio theo mã mời','Allow students to enter via group invites')}</p>
            {isAdmin ? (
              <button type="button" disabled={busy} onClick={toggleCreatorPass}>
                {creator.enabled ? tr(language,'Tạm khóa Creator Pass','Disable Creator Pass') : tr(language,'Bật Creator Pass sau nghiệm thu','Enable Creator Pass after QA')}
              </button>
            ) : (
              <p style={{color:'#8a6d10'}}><ShieldCheck size={13} aria-hidden="true"/> {tr(language,'Chỉ Admin được phép thay đổi.','Only an Admin can change this switch.')}</p>
            )}
          </div>
          <div className="setting-item">
            <div className="row">
              <span>{tr(language,'Tải tranh ảnh vào bảo tàng 3D','Student artwork uploads to 3D')}</span>
              <span className={'toggle' + (creator.upload_enabled ? '' : ' off')}>{creator.upload_enabled ? 'ON' : 'OFF'}</span>
            </div>
            <p>{tr(language,'JPG / PNG / WebP → PNG đã tái mã hóa, kho ảnh riêng tư và kiểm tra quyền nhóm','JPG / PNG / WebP → re-encoded PNG; private storage and group permissions')}</p>
            {isAdmin ? (
              <button type="button" disabled={busy || !creator.enabled} onClick={toggleArtwork}>
                {creator.upload_enabled ? tr(language,'Tắt tải tranh ảnh học sinh','Disable artwork uploads') : tr(language,'Cho phép tải tranh ảnh sau nghiệm thu','Enable artwork uploads after QA')}
              </button>
            ) : null}
          </div>
        </ContentPanel>

        <ContentPanel ariaLabel={tr(language,'Quy trình do Admin quản lý','Admin-controlled workflow')}>
          <h3><ShieldCheck size={24} aria-hidden="true" style={{verticalAlign:'middle', marginRight:8}}/> {tr(language,'Admin quản lý trực tiếp','Admin-controlled workflow')}</h3>
          <p style={{fontSize:14, lineHeight:1.55, color:'#516272'}}>
            {tr(language,
              'Admin tạo bài học, phát mã nhóm, chấm bài, yêu cầu sửa, phê duyệt và công bố triển lãm trực tiếp. Không giao giáo viên hay bộ phận duyệt khác.',
              'The Admin creates lessons, issues group passes, scores submissions, requests revisions, approves and publishes exhibitions directly. No teacher or department reviewer is assigned.')}
          </p>
          {workflow.map(w => (
            <div className="workflow-step" key={w.n}>
              <span className="step-number">{w.n}</span>
              <div><b>{w.title}</b><p>{w.desc}</p></div>
            </div>
          ))}
        </ContentPanel>
      </div>

      <div className="info-strip info mt20" role="note">
        {tr(language,
          'Công bố: nhóm học sinh nộp → Admin xem và chấm → Admin phê duyệt → Admin công bố. Phiên bản đã công bố được bảo vệ khỏi xóa nhầm.',
          'Publication: student group submits → Admin reviews and scores → Admin approves → Admin publishes. Published versions are protected from accidental deletion.')}
      </div>
    </>
  );
}
