import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './GlobalWorkScheduleTemplatePanel.css';

const TEMPLATE_URL = '/templates/mau-lich-lam-viec.csv';

const SAMPLE_ROWS = [
  {
    date: '27/07/2026',
    start: '08:00',
    end: '09:30',
    title: 'Họp tổ chuyên môn đầu tuần',
    location: 'Phòng họp 2',
    owner: 'TTCM',
    attendees: 'Toàn bộ giáo viên Tiếng Anh',
    note: 'Mang theo kế hoạch cá nhân',
    priority: 'Cao',
  },
  {
    date: '29/07/2026',
    start: '14:00',
    end: '16:00',
    title: 'Dự giờ chuyên đề kỹ năng đọc',
    location: 'Lớp 12.1',
    owner: 'Giáo viên phụ trách',
    attendees: 'Tổ Tiếng Anh',
    note: 'Chuẩn bị phiếu dự giờ',
    priority: 'Bình thường',
  },
  {
    date: '31/07/2026',
    start: '15:30',
    end: '17:00',
    title: 'Nộp ma trận kiểm tra giữa kỳ',
    location: 'Phòng chuyên môn',
    owner: 'TTCM',
    attendees: 'Giáo viên khối 12',
    note: 'Nộp kèm đặc tả và đáp án',
    priority: 'Khẩn',
  },
];

function findScheduleCenter() {
  if (typeof document === 'undefined') return null;
  return document.querySelector('.work-schedule-center');
}

export default function GlobalWorkScheduleTemplatePanel({ route = '' }) {
  const [host, setHost] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (route !== 'work-hub' || typeof document === 'undefined') {
      setHost(null);
      return undefined;
    }

    let insertedNode = null;
    const attach = () => {
      const center = findScheduleCenter();
      if (!center) return;
      let node = center.querySelector(':scope > [data-work-schedule-template-panel="true"]');
      if (!node) {
        node = document.createElement('div');
        node.dataset.workScheduleTemplatePanel = 'true';
        node.className = 'work-schedule-template-host';
        const toolbar = center.querySelector(':scope > .work-schedule-toolbar');
        if (toolbar?.nextSibling) center.insertBefore(node, toolbar.nextSibling);
        else center.appendChild(node);
        insertedNode = node;
      }
      setHost((current) => (current === node ? current : node));
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (insertedNode?.isConnected) insertedNode.remove();
    };
  }, [route]);

  async function copyHeader() {
    const header = 'Ngày,Bắt đầu,Kết thúc,Nội dung công việc,Địa điểm,Người phụ trách,Thành phần,Ghi chú,Mức độ';
    try {
      await navigator.clipboard.writeText(header);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (!host) return null;

  return createPortal(
    <section className="work-schedule-template-panel" aria-label="Mẫu file CSV lịch làm việc">
      <div className="work-schedule-template-copy">
        <span className="work-schedule-template-kicker">MẪU CSV ĐƯỢC HỖ TRỢ</span>
        <h3>Điền lịch theo đúng mẫu này</h3>
        <p>
          Giữ nguyên hàng tiêu đề. Mỗi dòng là một hoạt động. Các cột <b>Ngày</b> và
          <b> Nội dung công việc</b> là bắt buộc; những cột còn lại có thể để trống.
        </p>
        <div className="work-schedule-template-actions">
          <a href={TEMPLATE_URL} download="mau-lich-lam-viec.csv">⇩ Tải file CSV mẫu</a>
          <button type="button" onClick={copyHeader}>{copied ? '✓ Đã sao chép tiêu đề' : 'Sao chép hàng tiêu đề'}</button>
        </div>
      </div>

      <div className="work-schedule-template-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Nội dung công việc</th>
              <th>Địa điểm</th>
              <th>Người phụ trách</th>
              <th>Thành phần</th>
              <th>Ghi chú</th>
              <th>Mức độ</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ROWS.map((row) => (
              <tr key={`${row.date}-${row.title}`}>
                <td>{row.date}</td>
                <td>{row.start}</td>
                <td>{row.end}</td>
                <td><strong>{row.title}</strong></td>
                <td>{row.location}</td>
                <td>{row.owner}</td>
                <td>{row.attendees}</td>
                <td>{row.note}</td>
                <td><span className={`priority-${row.priority === 'Khẩn' ? 'urgent' : row.priority === 'Cao' ? 'high' : 'normal'}`}>{row.priority}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="work-schedule-template-note">
        Có thể mở file mẫu bằng Excel hoặc Google Sheets, nhập thêm các dòng rồi lưu lại dưới dạng CSV UTF-8 hoặc XLSX trước khi upload.
      </p>
    </section>,
    host,
  );
}
