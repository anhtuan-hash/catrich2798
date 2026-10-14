import React from 'react';
import { ArrowUpRight, Clock3, FolderHeart, Heart, Layers3, LibraryBig, MonitorPlay, Sparkles } from 'lucide-react';
import './Assessment5.css';

/** Light, data-driven command strip; no extra network requests or duplicate apps. */
export default function Assessment5Header({
  activities = [], favorites = [], recentIds = [], queueCount = 0,
  onFavorites, onRecent, onQueue, onWorkspace, language = 'vi',
}) {
  const vi = language === 'vi';
  const countFavorites = activities.filter(a => favorites.includes(a.id)).length;
  const recently = activities.filter(a => recentIds.includes(a.id)).length;
  const entries = [
    {key:'favorites',icon:Heart,number:countFavorites,vi:'Yêu thích',en:'Favorites',hint:vi?'Trò chơi đã lưu':'Saved activities',run:onFavorites},
    {key:'recent',icon:Clock3,number:recently,vi:'Gần đây',en:'Recent',hint:vi?'Mở nhanh hoạt động':'Resume activities',run:onRecent},
    {key:'queue',icon:MonitorPlay,number:queueCount,vi:'Buổi dạy',en:'Teaching queue',hint:vi?'Chuỗi hoạt động':'Classroom sequence',run:onQueue},
    {key:'workspace',icon:FolderHeart,number:activities.length,vi:'Thư viện',en:'Library',hint:vi?'Bộ sưu tập & báo cáo':'Collections & reports',run:onWorkspace},
  ];
  return <section className="lcs5-command" aria-label="BRIAN Assessment 5.0">
    <div className="lcs5-command-head">
      <div className="lcs5-command-mark"><Sparkles size={18}/><span>ASSESSMENT 5.0</span></div>
      <strong>{vi?'Không gian tổ chức tiết dạy':'Teaching Command Center'}</strong>
      <span>{vi?'Colorful Bento · Công cụ thực tế cho giáo viên':'Colorful Bento · Classroom ready'}</span>
    </div>
    <div className="lcs5-bento-grid">
      {entries.map(e=><button type="button" className={'lcs5-bento-tile is-'+e.key} key={e.key} onClick={e.run}>
        <span className="lcs5-bento-icon"><e.icon size={21}/></span>
        <span className="lcs5-bento-copy"><b>{vi?e.vi:e.en}</b><small>{e.hint}</small></span>
        <span className="lcs5-bento-count">{e.number}</span>
        <ArrowUpRight size={16} className="lcs5-bento-arrow" aria-hidden="true"/>
      </button>)}
    </div>
  </section>;
}
