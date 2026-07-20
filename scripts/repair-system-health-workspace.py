#!/usr/bin/env python3
from pathlib import Path
import re

path = Path.cwd() / "src/pages/SystemHealthCenter.jsx"
if not path.exists():
    raise SystemExit("❌ Không tìm thấy src/pages/SystemHealthCenter.jsx")

text = path.read_text(encoding="utf-8")
text = re.sub(
    r"^\s*import\s*\{\s*loadWorkspace\s*\}\s*from\s*['\"]\.\./utils/workspace\.js['\"];\s*\n",
    "",
    text,
    flags=re.MULTILINE,
)
text = text.replace(
    "const workspaceStats = loadWorkspace(currentUser);",
    "const workspaceStats = { tabs: [] };",
)

if "workspace.js" in text or "loadWorkspace(" in text:
    raise SystemExit("❌ Vẫn còn phụ thuộc workspace.js")
if "const workspaceStats = { tabs: [] };" not in text:
    raise SystemExit("❌ Không tạo được trạng thái workspace tương thích")

path.write_text(text, encoding="utf-8")
print("✅ Đã loại bỏ phụ thuộc workspace.js khỏi SystemHealthCenter.")
