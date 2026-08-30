import React, { useMemo, useRef, useState } from 'react';
import './BrianUI.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function Tabs({
  items = [],
  value,
  defaultValue,
  onValueChange,
  ariaLabel = 'Tabs',
  className,
}) {
  const enabledItems = useMemo(() => items.filter((item) => !item.disabled), [items]);
  const firstEnabledValue = enabledItems[0]?.value;
  const [internalValue, setInternalValue] = useState(defaultValue ?? firstEnabledValue);
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : internalValue;
  const tabRefs = useRef([]);

  const setActive = (nextValue) => {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  const focusEnabledByOffset = (currentIndex, offset) => {
    if (!enabledItems.length) return;
    const currentValue = items[currentIndex]?.value;
    const enabledIndex = enabledItems.findIndex((item) => item.value === currentValue);
    const baseIndex = enabledIndex >= 0 ? enabledIndex : 0;
    const nextEnabled = enabledItems[(baseIndex + offset + enabledItems.length) % enabledItems.length];
    const nextIndex = items.findIndex((item) => item.value === nextEnabled.value);
    tabRefs.current[nextIndex]?.focus();
    setActive(nextEnabled.value);
  };

  const onKeyDown = (event, index) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusEnabledByOffset(index, 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusEnabledByOffset(index, -1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      const first = enabledItems[0];
      const targetIndex = items.findIndex((item) => item.value === first?.value);
      tabRefs.current[targetIndex]?.focus();
      if (first) setActive(first.value);
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = enabledItems[enabledItems.length - 1];
      const targetIndex = items.findIndex((item) => item.value === last?.value);
      tabRefs.current[targetIndex]?.focus();
      if (last) setActive(last.value);
    }
  };

  const activeItem = items.find((item) => item.value === activeValue) || enabledItems[0];

  return (
    <div className={cx('bui-tabs', className)}>
      <div className="bui-tabs__list" role="tablist" aria-label={ariaLabel}>
        {items.map((item, index) => {
          const selected = item.value === activeItem?.value;
          const tabId = `bui-tab-${String(item.value).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
          const panelId = `${tabId}-panel`;
          return (
            <button
              key={item.value}
              ref={(node) => { tabRefs.current[index] = node; }}
              type="button"
              className="bui-tabs__tab"
              role="tab"
              id={tabId}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => setActive(item.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {item.icon ? <span className="bui-tabs__icon" aria-hidden="true">{item.icon}</span> : null}
              <span>{item.label}</span>
              {item.badge != null ? <span className="bui-tabs__count">{item.badge}</span> : null}
            </button>
          );
        })}
      </div>
      {activeItem ? (
        <div
          className="bui-tabs__panel"
          role="tabpanel"
          id={`bui-tab-${String(activeItem.value).replace(/[^a-zA-Z0-9_-]/g, '-')}-panel`}
          aria-labelledby={`bui-tab-${String(activeItem.value).replace(/[^a-zA-Z0-9_-]/g, '-')}`}
          tabIndex={0}
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}
