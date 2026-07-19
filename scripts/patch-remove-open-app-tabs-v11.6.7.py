#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path.cwd()

def read(rel):
    path = ROOT / rel
    if not path.exists():
        raise SystemExit(f"❌ Thiếu file bắt buộc: {rel}")
    return path.read_text(encoding="utf-8")

def write(rel, text):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")

def remove_workspace_render(text):
    lines = text.splitlines(keepends=True)
    output = []
    index = 0
    removed_block = False

    while index < len(lines):
        line = lines[index]

        if "const WorkspaceTabs = lazy(() => import('./components/WorkspaceTabs.jsx'));" in line:
            index += 1
            continue

        if "{currentUser && canAccessRoute" in line:
            lookahead = "".join(lines[index:index + 12])
            if 'scope="workspace-tabs"' in lookahead and "<WorkspaceTabs " in lookahead:
                removed_block = True
                index += 1
                while index < len(lines):
                    if ") : null}" in lines[index]:
                        index += 1
                        break
                    index += 1
                continue

        output.append(line)
        index += 1

    result = "".join(output)

    if "WorkspaceTabs" in result:
        raise SystemExit("❌ Không thể gỡ hoàn toàn WorkspaceTabs khỏi src/main.jsx")

    if not removed_block and 'scope="workspace-tabs"' in text:
        raise SystemExit("❌ Không xác định được khối render WorkspaceTabs")

    return result

def patch_health(text):
    text = re.sub(
        r"^import \{ loadWorkspace \} from '\.\./utils/workspace\.js';\s*\n",
        "",
        text,
        flags=re.M,
    )
    text = re.sub(
        r"^\s*const workspaceStats = loadWorkspace\(currentUser\);\s*\n",
        "",
        text,
        flags=re.M,
    )
    text = re.sub(
        r"^\s*<div><dt>\{language === 'vi' \? 'Tab đang mở' : 'Open tabs'\}</dt><dd>\{workspaceStats\.tabs\.length\}</dd></div>\s*\n",
        "",
        text,
        flags=re.M,
    )
    return text

def patch_config_migration(text):
    text = re.sub(
        r"\n\s*\{\n\s*id: 'workspace-tabs',.*?\n\s*\},\n(?=\];)",
        "\n",
        text,
        flags=re.S,
    )

    if "id: 'workspace-tabs'" in text or "pattern: /^bes-workspace-tabs:/" in text:
        raise SystemExit("❌ Không thể gỡ schema lưu Workspace Tabs")

    cleanup = """
  // Retire stale open-app tab state from V10.85/V11 without recreating it.
  const retiredWorkspaceKeys = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith('bes-workspace-tabs:')) retiredWorkspaceKeys.push(key);
  }
  retiredWorkspaceKeys.forEach((key) => {
    const raw = storage.getItem(key);
    writeBackup(storage, key, raw);
    storage.removeItem(key);
    results.push({ id: 'workspace-tabs-retired', key, status: 'removed' });
  });
"""

    anchor = "  STORAGE_SCHEMAS.forEach((schema) => {"
    if "workspace-tabs-retired" not in text:
        if anchor not in text:
            raise SystemExit("❌ Không tìm thấy vòng lặp migration")
        text = text.replace(anchor, cleanup + "\n" + anchor, 1)

    return text

def patch_css(text):
    text = re.sub(
        r"\n\.bes-workspace-tabs\{.*?\.bes-workspace-new\{[^\n]*\}\n",
        "\n",
        text,
        flags=re.S,
    )
    text = text.replace(
        'html[data-theme="dark"] .bes-workspace-tabs,html[data-theme="dark"] .bes-workspace-tab,',
        '',
    )
    text = re.sub(
        r"^\s*\.bes-workspace-tabs\{[^\n]*\}\.bes-workspace-tab\{[^\n]*\}\.bes-workspace-tab-main>span:last-child\{[^\n]*\}\s*\n",
        "",
        text,
        flags=re.M,
    )
    text = text.replace(".bes-workspace-tab,", "")
    text = text.replace(
        "Workspace tabs · Content transfer · Version history · Sync queue",
        "Content transfer · Version history · Sync queue",
    )
    return text

def patch_smoke(text):
    text = re.sub(
        r"^const workspaceTabsSource = fs\.readFileSync\([^\n]+\);\s*\n",
        "",
        text,
        flags=re.M,
    )
    text = re.sub(
        r"^const workspaceSource = fs\.readFileSync\([^\n]+\);\s*\n",
        "",
        text,
        flags=re.M,
    )
    text = re.sub(
        r"^add\('V10\.85 workspace tabs are mounted globally',[^\n]+\);\s*\n",
        "",
        text,
        flags=re.M,
    )
    text = text.replace("cssSource.includes('.bes-workspace-tabs') && ", "")
    return text

def patch_historical_check(text):
    text = re.sub(
        r"^const workspace=read\('src/utils/workspace\.js'\);\s*\n",
        "",
        text,
        flags=re.M,
    )
    text = re.sub(
        r"^pass\('stale Listening Lab tabs pruned',[^\n]+\);\s*\n",
        "",
        text,
        flags=re.M,
    )
    return text

def patch_historical_guard(text):
    text = text.replace("'src/utils/workspace.js',", "")
    text = re.sub(
        r"^\s*\['workspace cleanup',[^\n]+\],?\s*\n",
        "",
        text,
        flags=re.M,
    )
    return text

write("src/main.jsx", remove_workspace_render(read("src/main.jsx")))
write("src/pages/SystemHealthCenter.jsx", patch_health(read("src/pages/SystemHealthCenter.jsx")))
write("src/utils/configMigration.js", patch_config_migration(read("src/utils/configMigration.js")))
write("src/styles/legacy/06-current-features.css", patch_css(read("src/styles/legacy/06-current-features.css")))
write("scripts/smoke-test.mjs", patch_smoke(read("scripts/smoke-test.mjs")))

for rel, func in [
    ("scripts/check-v11.5.5.mjs", patch_historical_check),
    ("scripts/release-guard-v11.5.5.mjs", patch_historical_guard),
]:
    path = ROOT / rel
    if path.exists():
        write(rel, func(path.read_text(encoding="utf-8")))

for rel in [
    "src/components/WorkspaceTabs.jsx",
    "src/utils/workspace.js",
]:
    path = ROOT / rel
    if path.exists():
        path.unlink()

print("✅ Đã xoá thanh ứng dụng đang mở và toàn bộ runtime lưu/khôi phục tab.")
