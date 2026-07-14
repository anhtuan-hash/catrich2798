import React from 'react';
import { LAUNCHER_CONFIG_KEY } from '../utils/launcherPreferences.js';
import { recordRuntimeError } from '../utils/runtimeDiagnostics.js';

const RECOVERY_RELOAD_KEY = 'bes-ui-recovery-reload-v10832';

function clearLauncherCache() {
  try {
    window.localStorage.removeItem(LAUNCHER_CONFIG_KEY);
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

function reloadCleanly() {
  try {
    window.sessionStorage.setItem(RECOVERY_RELOAD_KEY, String(Date.now()));
  } catch {
    // Reload still works without session storage.
  }
  window.location.reload();
}

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    try {
      recordRuntimeError({
        scope: this.props.scope || 'application',
        message: String(error?.message || error || 'Unknown render error'),
        stack: String(error?.stack || ''),
        componentStack: String(errorInfo?.componentStack || ''),
      });
    } catch {
      // Diagnostics are best effort only.
    }
    console.error(`[Brian English] ${this.props.scope || 'application'} render error`, error, errorInfo);
  }

  resetBoundary = () => {
    this.setState({ error: null, errorInfo: null });
  };

  resetLauncherAndReload = () => {
    clearLauncherCache();
    reloadCleanly();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.compact) {
      return (
        <div className="bes-feature-recovery" role="alert">
          <strong>Không thể mở {this.props.label || 'tính năng này'}.</strong>
          <span>Dữ liệu của thầy vẫn an toàn.</span>
          <div>
            <button type="button" onClick={this.resetBoundary}>Thử lại</button>
            <button type="button" onClick={reloadCleanly}>Tải lại</button>
          </div>
        </div>
      );
    }

    return (
      <main className="bes-crash-recovery" role="alert">
        <section>
          <span className="bes-crash-recovery-mark" aria-hidden="true">BE</span>
          <p>KHÔI PHỤC GIAO DIỆN</p>
          <h1>Ứng dụng gặp lỗi hiển thị</h1>
          <p>
            Hệ thống đã chặn lỗi để tránh trang trắng. Tài khoản và dữ liệu của thầy không bị xóa.
          </p>
          <div className="bes-crash-recovery-actions">
            <button type="button" className="primary" onClick={reloadCleanly}>Tải lại ứng dụng</button>
            <button type="button" onClick={this.resetLauncherAndReload}>Khôi phục launcher mặc định</button>
            <button type="button" onClick={() => { window.location.hash = '#/qa'; this.resetBoundary(); }}>Kiểm tra hệ thống</button>
            <button type="button" onClick={() => { window.location.hash = '#/home'; reloadCleanly(); }}>Về Trang chủ</button>
          </div>
          <details>
            <summary>Chi tiết kỹ thuật</summary>
            <code>{String(error?.message || error)}</code>
          </details>
        </section>
      </main>
    );
  }
}
