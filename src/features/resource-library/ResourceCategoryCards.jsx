import React from 'react';
import { categoryDescription, categoryName } from './resourceCategories.js';

function relativeDate(value, language) {
  if (!value) return language === 'en' ? 'No resources yet' : 'Chưa có tài liệu';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return language === 'en' ? 'No update time' : 'Chưa có thời gian cập nhật';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return language === 'en' ? 'Updated just now' : 'Vừa cập nhật';
  if (minutes < 60) return language === 'en' ? `${minutes} min ago` : `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return language === 'en' ? `${hours} hr ago` : `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return language === 'en' ? `${days} day${days > 1 ? 's' : ''} ago` : `${days} ngày trước`;
}

export function ResourceCategoryCards({ categories, activeCategory, onSelect, language = 'vi', loading = false }) {
  if (loading && !categories.length) {
    return <div className="rl-category-grid" aria-busy="true">{Array.from({ length: 8 }).map((_, index) => <div className="rl-category-card is-skeleton" key={index} />)}</div>;
  }

  return (
    <div className="rl-category-grid" aria-label={language === 'en' ? 'Resource categories' : 'Danh mục tài liệu'}>
      {categories.map((category) => {
        const selected = activeCategory === category.slug;
        return (
          <button
            type="button"
            key={category.slug}
            className={`rl-category-card tone-${category.tone || 'blue'}${selected ? ' is-active' : ''}`}
            onClick={() => onSelect(category.slug)}
            aria-pressed={selected}
            aria-controls="resource-library-results"
            title={language === 'en' ? `Open ${categoryName(category, language)} folder` : `Mở thư mục ${categoryName(category, language)}`}
          >
            <span className="rl-category-card__icon" aria-hidden="true">{category.displayIcon}</span>
            <span className="rl-category-card__body">
              <span className="rl-category-card__title">{categoryName(category, language)}</span>
              <span className="rl-category-card__description">{categoryDescription(category, language)}</span>
              <span className="rl-category-card__latest">
                {category.latest_title ? <strong>{category.latest_title}</strong> : null}
                <small>{relativeDate(category.latest_at, language)}</small>
              </span>
            </span>
            <span className="rl-category-card__stats">
              <strong>{category.item_count}</strong>
              <small>{language === 'en' ? 'resources' : 'tài liệu'}</small>
              {category.new_count > 0 ? <span className="rl-new-badge">+{category.new_count} {language === 'en' ? 'new' : 'mới'}</span> : null}
              <span className="rl-open-folder-hint">{language === 'en' ? 'Open folder →' : 'Mở thư mục →'}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
