import React, {useState} from 'react';
import {CheckCircle2,FileText,Flag,Image,Laptop,LockKeyhole,ShieldAlert,ShieldCheck,UsersRound} from 'lucide-react';
import {staffRequest as defaultTransport} from '../../v3/museumApi.js';
import './SettingsEditorial.css';

const tr = (lang, vi, en) => lang === 'en' ? en : vi;

function SettingControl({icon:Icon, title, description, state, enabled, children}) {
  return (
    <div className="ig-settings-control">
      <div className="ig-settings-line-icon"><Icon aria-hidden="true"/></div>
      <div className="ig-settings-control-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="ig-settings-control-actions">
        <span className="ig-settings-state" data-enabled={Boolean(enabled)}>{state}</span>
        {children}
      </div>
    </div>
  );
}
export default function SettingsScreen({language='en', data, staff, onRefresh, transport=defaultTransport}) {
  const payload = data || staff || {};
  const isAdmin = payload?.profile?.role === 'admin' && !payload?.offlineReadOnly && !payload?.publicReadOnly;
  const creator = payload?.creatorSettings || {};
  const t = (vi, en) => tr(language, vi, en);
  const stateLabel = enabled => enabled ? t('Đang bật', 'Enabled') : t('Đang tắt', 'Disabled');
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
    [t('Phân công', 'Assign'), t('Tạo bài học và cấp mã nhóm.', 'Create lessons and issue group codes.')],
    [t('Xem và duyệt', 'Review and approve'), t('Chấm bài, duyệt hoặc yêu cầu chỉnh sửa.', 'Score and approve submissions or request revisions.')],
    [t('Công bố', 'Publish'), t('Đưa bài đã duyệt lên triển lãm.', 'Publish approved submissions in the exhibition.')],
  ];

  return (
    <section className="swiss-editorial-settings" data-testid="igv2-settings-screen">
      <header className="ig-settings-heading">
        <h1>{t('Cài đặt & phân quyền.', 'Settings & permissions.')}</h1>
        <p>{t('Quản lý quyền truy cập học sinh và quy trình công bố.', 'Manage student access and the publication workflow.')}</p>
      </header>

      <div className="ig-settings-roles">
        <div className="ig-settings-role">
          <div className="ig-settings-role-icon"><UsersRound aria-hidden="true"/></div>
          <div>
            <span>{t('Học sinh', 'Students')}</span>
            <strong>{t('QR + mã nhóm', 'QR + group code')}</strong>
            <p>{t('Vào Studio bằng mã mời', 'Enter the Studio using a group invitation')}</p>
          </div>
        </div>
        <div className="ig-settings-role ig-settings-role-admin">
          <div className="ig-settings-role-icon"><ShieldCheck aria-hidden="true"/></div>
          <div>
            <strong>Admin</strong>
            <span>{t('Phê duyệt & công bố', 'Approve & publish')}</span>
          </div>
        </div>
      </div>

      {error && <div className="ig-settings-feedback ig-settings-feedback-error" role="alert"><ShieldAlert size={18} aria-hidden="true"/> {error}</div>}
      {message && <div className="ig-settings-feedback" role="status"><CheckCircle2 size={18} aria-hidden="true"/> {message}</div>}

      <div className="ig-settings-layout">
        <section className="ig-settings-access" aria-labelledby="ig-settings-access-title">
          <header className="ig-settings-panel-heading">
            <h2 id="ig-settings-access-title"><Laptop aria-hidden="true"/>{t('Quyền truy cập học sinh', 'Student access')}</h2>
            <p>{t('Học sinh vào Studio bằng mã mời của nhóm.', 'Students enter the Studio using their group invitation.')}</p>
          </header>
          <SettingControl
            icon={FileText}
            title="Student Creator Pass"
            description={t('Cho phép nhóm mở Studio theo mã mời.', 'Allow groups to open the Studio using their invitation.')}
            state={stateLabel(creator.enabled)}
            enabled={creator.enabled}
          >
            {isAdmin && (
              <button type="button" disabled={busy} onClick={toggleCreatorPass}>
                {creator.enabled ? t('Tạm khóa Creator Pass', 'Disable Creator Pass') : t('Bật Creator Pass', 'Enable Creator Pass')}
              </button>
            )}
          </SettingControl>
          <SettingControl
            icon={Image}
            title={t('Tải tranh ảnh vào bảo tàng 3D', 'Artwork uploads to the 3D museum')}
            description={t('Hỗ trợ JPG, PNG và WebP. Ảnh được lưu riêng theo nhóm.', 'Supports JPG, PNG, and WebP. Images are stored privately by group.')}
            state={stateLabel(creator.upload_enabled)}
            enabled={creator.upload_enabled}
          >
            {isAdmin && (
              <button type="button" disabled={busy || !creator.enabled} onClick={toggleArtwork}>
                {creator.upload_enabled ? t('Tắt tải tranh ảnh học sinh', 'Disable artwork uploads') : t('Bật tải tranh ảnh học sinh', 'Enable artwork uploads')}
              </button>
            )}
          </SettingControl>
          {!isAdmin && (
            <p className="ig-settings-readonly"><LockKeyhole size={15} aria-hidden="true"/>
              {t('Chỉ Admin được phép thay đổi các cài đặt này.', 'Only an Admin can change these settings.')}
            </p>
          )}
        </section>

        <section className="ig-settings-workflow" aria-labelledby="ig-settings-workflow-title">
          <header className="ig-settings-panel-heading">
            <h2 id="ig-settings-workflow-title"><Flag aria-hidden="true"/>{t('Quy trình công bố', 'Publication workflow')}</h2>
          </header>
          <ol>
            {workflow.map(([title, description], index) => (
              <li key={title}>
                <span className="ig-settings-step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="ig-settings-safety-note" role="note">
        <LockKeyhole size={22} aria-hidden="true"/>
        <p>{t('Bài đã công bố được bảo vệ khỏi thao tác xóa nhầm.', 'Published submissions are protected from accidental deletion.')}</p>
      </div>
    </section>
  );
}
