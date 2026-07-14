import React from 'react';
import { categoryName } from './resourceCategories.js';

export function ResourceUploadCategoryPicker({ categories, value, onChange, language = 'vi', disabled = false }) {
  return (
    <fieldset className="rl-upload-category" disabled={disabled}>
      <legend>{language === 'en' ? 'Choose a category' : 'Chọn thẻ phân loại'}</legend>
      <div className="rl-upload-category__grid">
        {categories.map((category) => (
          <label key={category.slug} className={`rl-category-choice tone-${category.tone || 'blue'}${value === category.slug ? ' is-selected' : ''}`}>
            <input type="radio" name="resource-category" value={category.slug} checked={value === category.slug} onChange={(event) => onChange(event.target.value)} />
            <span className="rl-category-choice__icon" aria-hidden="true">{category.displayIcon}</span>
            <span>{categoryName(category, language)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
