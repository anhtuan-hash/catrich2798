export const AI_PROVIDER_CATEGORIES = {};
export const PROVIDER_CATALOG = [];
export function getProviderCatalogEntry() { return null; }
export function getProviderCatalogMap() { return new Map(); }
export function mergeProviderInfo(id, legacy = {}) { return { id, ...legacy }; }
