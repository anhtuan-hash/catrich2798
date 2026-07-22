import React from 'react';

const paths = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V21h14V10.5M9 21v-6h6v6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>,
  tasks: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 2 2 4-4M8 15h8"/></>,
  library: <><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/><path d="M4 19h16M8 7h8M8 11h8M8 15h5"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  cloud: <path d="M17.5 19H6a4 4 0 0 1-.5-8 6.5 6.5 0 0 1 12.4-1.8A4.8 4.8 0 0 1 17.5 19z"/>,
  refresh: <><path d="M20 11a8 8 0 1 0 2 5"/><path d="M20 4v7h-7"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/></>,
  download: <><path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
  warning: <><path d="M10.3 3.8 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15 15a5 5 0 0 1 6 5"/></>,
  badge: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/><path d="m9 12 2 2 4-5"/></>,
  award: <><circle cx="12" cy="8" r="5"/><path d="m8.5 12-2 9 5.5-3 5.5 3-2-9"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></>,
  archive: <><path d="M4 7h16v14H4zM3 3h18v4H3zM9 11h6"/></>,
  flag: <><path d="M5 22V4M5 5h11l-2 4 2 4H5"/></>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
};

export default function DepartmentIcon({ name, size = 18, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.file}
    </svg>
  );
}
