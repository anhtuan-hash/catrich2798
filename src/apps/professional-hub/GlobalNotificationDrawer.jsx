import React from 'react';

const DEFAULT_NOTIFICATIONS = [
  { id: 1, title: 'Có 2 công việc sắp đến hạn', detail: 'Ma trận đề kiểm tra học kỳ II, Minh chứng thi đua HKII', time: '5 phút trước', read: false },
  { id: 2, title: 'Cuộc họp tổ vào 15:30 hôm nay', detail: 'Nội dung: Đánh giá hoạt động tháng 5', time: '30 phút trước', read: false },
  { id: 3, title: 'Hồ sơ của Nguyễn Thị Mai đã được phê duyệt', detail: 'Kế hoạch bài dạy Unit 8 – Lớp 6A1', time: '1 giờ trước', read: false },
  { id: 4, title: 'Minh chứng mới được cập nhật', detail: 'Thầy Nam đã thêm minh chứng mới cho chuyên đề STEM', time: '2 giờ trước', read: true },
  { id: 5, title: 'Báo cáo tháng đã hoàn thành', detail: 'Bạn có thể xem và xuất báo cáo', time: '3 giờ trước', read: true },
];

export function readGlobalNotifications() {
  try {
    const stored = localStorage.getItem('department-v2-notifications');
    return stored ? JSON.parse(stored) : DEFAULT_NOTIFICATIONS;
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

export default function GlobalNotificationDrawer({ open, notifications, setNotifications, onClose, setToast }) {
  if (!open) return null;
  const unread = notifications.filter((item) => !item.read).length;

  const markAllRead = () => {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    setToast('Đã đánh dấu tất cả thông báo là đã đọc.');
  };

  const openItem = (id, title) => {
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
    setToast(title);
  };

  return <>
    <button className="global-notification-scrim" aria-label="Đóng thông báo" onClick={onClose}/>
    <aside className="global-notification-drawer" data-testid="global-notification-drawer">
      <header>
        <div><span>TRUNG TÂM THÔNG BÁO</span><h2>Thông báo</h2><small>{unread} thông báo chưa đọc</small></div>
        <button className="global-drawer-close" onClick={onClose} aria-label="Đóng bảng thông báo">×</button>
      </header>
      <div className="global-drawer-toolbar"><button onClick={markAllRead}>Đánh dấu tất cả đã đọc</button></div>
      <div className="global-notification-list">
        {notifications.map((item) => <button key={item.id} className={item.read ? 'read' : ''} onClick={() => openItem(item.id, item.title)}>
          <span className="global-notification-dot"/>
          <span><strong>{item.title}</strong><small>{item.detail}</small><time>{item.time}</time></span>
        </button>)}
      </div>
    </aside>
  </>;
}
