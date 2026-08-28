from pathlib import Path

panel_path = Path('src/components/admin/RegionalFontAdminPanel.jsx')
panel = panel_path.read_text()
old = """    const limits = getRegionalFontSizeLimits(regionId);
    const number = Number(value);
    const nextSize = Number.isFinite(number)
      ? Math.min(limits.max, Math.max(limits.min, Math.round(number)))
      : null;"""
new = """    const limits = getRegionalFontSizeLimits(regionId);
    const shouldReset = value == null || value === '';
    const number = Number(value);
    const nextSize = shouldReset
      ? null
      : (Number.isFinite(number)
        ? Math.min(limits.max, Math.max(limits.min, Math.round(number)))
        : null);"""
if panel.count(old) != 1:
    raise SystemExit(f'expected one regional size setter, found {panel.count(old)}')
panel_path.write_text(panel.replace(old, new, 1))

test_path = Path('scripts/test-font-upload-live-preview.mjs')
test = test_path.read_text()
anchor = "  ['every regional font size has a live range control', panel.includes('regional-font-card__font-size') && panel.includes('type=\"range\"') && panel.includes('setRegionFontSize(region.id')],"
addition = anchor + "\n  ['regional size default action removes the override instead of clamping to minimum', panel.includes(\"const shouldReset = value == null || value === ''\") && panel.includes('const nextSize = shouldReset') && panel.includes('setRegionFontSize(region.id, null)')],"
if test.count(anchor) != 1:
    raise SystemExit(f'expected one regional size contract anchor, found {test.count(anchor)}')
test_path.write_text(test.replace(anchor, addition, 1))
