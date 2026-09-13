import React from 'react';
import {
  Bell,
  BookOpenCheck,
  ContactRound,
  Grid2X2,
  Home,
  LogIn,
  Search,
  Settings,
  UserRound,
  ClipboardCheck,
} from 'lucide-react';

const ICONS = {
  home: Home,
  apps: Grid2X2,
  practice: BookOpenCheck,
  attendance: ClipboardCheck,
  notifications: Bell,
  account: UserRound,
  resources: BookOpenCheck,
  search: Search,
  contact: ContactRound,
  login: LogIn,
  settings: Settings,
};

export default function MobileBottomNavigation({ items = [], onSelect }) {
  return (
    <nav className="bes-mobile-bottomnav" aria-label="Điều hướng chính trên di động" data-bes-mobile-bottomnav="true">
      <div className="bes-mobile-bottomnav__inner">
        {items.slice(0, 5).map((item, index) => {
          const Icon = ICONS[item.id] || Grid2X2;
          const center = index === 2;
          return (
            <button
              key={item.id}
              type="button"
              className={`bes-mobile-bottomnav__item${item.active ? ' is-active' : ''}${center ? ' is-center' : ''}`}
              aria-current={item.active ? 'page' : undefined}
              onClick={() => onSelect?.(item)}
            >
              <span className="bes-mobile-bottomnav__icon" aria-hidden="true">
                <Icon size={center ? 23 : 21} strokeWidth={item.active ? 2.5 : 2.1} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
