export const defaultDisplay = Object.freeze({ opacity: 14, highContrast: true });
export const maxDisplayOpacity = 40;

export function isDisplayConfig(value) {
  return Number.isInteger(value?.opacity) && value.opacity >= 0 &&
    value.opacity <= maxDisplayOpacity && typeof value.highContrast === 'boolean';
}
