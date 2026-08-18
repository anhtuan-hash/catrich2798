import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2CommandBar, B2LauncherTile, B2PageHeader, B2SearchBox, B2SectionHeader, B2Tabs } from '../components/B2UI.jsx';
import './B2TeachingHub.css';

const WEBSITE_PREVIEW = [
  { id: 1, title: 'Bảng tương tác', category: 'Công cụ dạy học', domain: 'ladigitale.dev', icon: '↗', tone: 'blue', pinned: true },
  { id: 2, title: 'Ba Ba Dum', category: 'Từ vựng', domain: 'babadum.com', icon: 'BA', tone: 'violet', pinned: true },
  { id: 3, title: 'Classroomscreen', category: 'Trình chiếu', domain: 'classroomscreen.com', icon: 'CS', tone: 'cyan' },
  { id: 4, title: 'Wordwall', category: 'Trò chơi', domain: 'wordwall.net', icon: 'WW', tone: 'green' },
  { id: 5, title: 'Wayground', category: 'Kiểm tra', domain: 'wayground.com', icon: 'WQ', tone: 'orange' },
  { id: 6, title: 'Canva for Education', category: 'Thiết kế', domain: 'canva.com', icon: 'CA', tone: 'cyan' },
  { id: 7, title: 'Padlet', category: 'Cộng tác', domain: 'padlet.com', icon: 'PA', tone: 'violet', shared: true },
  { id: 8, title: 'YouTube EDU', category: 'Video', domain: 'youtube.com', icon: 'YT', tone: 'red' },
  { id: 9, title: 'Genially', category: 'Tương tác', domain: 'genially.com', icon: 'GE', tone: 'orange' },
  { id: 10, title: 'Quizlet', category: 'Từ vựng', domain: 'quizlet.com', icon: 'QZ', tone: 'blue', shared: true },
];

export default function B2TeachingHub() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);

  const categories = useMemo(() => ['all', ...Array.from(new Set(WEBSITE_PREVIEW.map((item) => item.category)))], []);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return WEBSITE_PREVIEW.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!needle) return true;
      return [item.title, item.category, item.domain].some((value) => value.toLowerCase().includes(needle));
    });
  }, [query, category]);

  return (
    <>
      <B2PageHeader
        eyebrow="TTCM · TEACHING TOOL HUB"
        title="Một launcher chung cho công cụ dạy học."
        description="TTCM tuyển chọn website, ghim công cụ quan trọng và chia sẻ cho giáo viên. V2 giữ mọi thao tác trong một workspace gọn thay vì hero lớn và card rời rạc."
        actions={(
          <>
            <B2Button variant="primary" icon="＋">Thêm website</B2Button>
            <B2Button icon="⇧">Chia sẻ hàng loạt</B2Button>
          </>
        )}
        aside={(
          <div className="b2-hub-kpis">
            <div><strong>10</strong><span>website</span></div>
            <div><strong>2</strong><span>đã ghim</span></div>
            <div><strong>2</strong><span>được chia sẻ</span></div>
          </div>
        )}
      />

      <B2CommandBar className="b2-hub-commandbar">
        <B2SearchBox value={query} onChange={setQuery} placeholder="Tìm website, danh mục hoặc domain…" />
        <B2Tabs
          items={categories.slice(0, 5).map((item) => ({ id: item, label: item === 'all' ? 'Tất cả' : item }))}
          value={category}
          onChange={setCategory}
        />
        <B2Badge tone="neutral">Kéo thả · Ghim · Chia sẻ</B2Badge>
      </B2CommandBar>

      <section className="b2-hub-workspace">
        <B2SectionHeader
          eyebrow="CÔNG CỤ CỦA TỔ"
          title="Mở nhanh"
          description={`${visible.length} website đang hiển thị · desktop tối ưu 5 cột`}
          action={<B2Button variant="ghost">Quản lý danh mục →</B2Button>}
        />

        <div className="b2-launcher-grid">
          {visible.map((item) => (
            <B2LauncherTile
              key={item.id}
              {...item}
              onOpen={() => setSelected(item)}
            />
          ))}
        </div>
      </section>

      <section className="b2-hub-bottom-grid">
        <div className="b2-hub-info-card">
          <span className="b2-hub-info-card__icon">◎</span>
          <div><small>QUẢN LÝ</small><strong>TTCM kiểm soát một lần</strong><p>Thêm, sửa, ẩn/hiện, ghim và chia sẻ mà không làm giao diện giáo viên trở nên nặng nề.</p></div>
        </div>
        <div className="b2-hub-info-card">
          <span className="b2-hub-info-card__icon">▣</span>
          <div><small>TRẢI NGHIỆM</small><strong>Mở trực tiếp trong Brian</strong><p>Website hỗ trợ iframe chạy ngay trong workspace; website chặn nhúng sẽ chuyển sang tab riêng.</p></div>
        </div>
      </section>

      {selected ? (
        <div className="b2-hub-preview-strip">
          <div><B2Badge tone="blue">WEBSITE PREVIEW</B2Badge><strong>{selected.title}</strong><span>{selected.domain} · hành vi production chưa bị thay đổi.</span></div>
          <B2Button variant="ghost" onClick={() => setSelected(null)}>Đóng</B2Button>
        </div>
      ) : null}
    </>
  );
}
