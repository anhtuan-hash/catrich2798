#!/bin/bash
set -Eeuo pipefail

ZIP="$(find "$HOME/Downloads" -maxdepth 1 -type f -name 'brian-english-studio-v12.40.6-avocado-raised-home-full-source*.zip' -exec stat -f '%m|%N' {} \; | sort -nr | sed -n '1s/^[^|]*|//p')"

if [ -z "$ZIP" ]; then
  echo "❌ Không tìm thấy ZIP V12.40.6 trong Downloads."
  exit 1
fi

for tool in git npm unzip rsync; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "❌ Máy chưa có công cụ bắt buộc: $tool"
    exit 1
  fi
done

TMP="$(mktemp -d /tmp/brian-v12406.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

echo "📦 Đang đọc ZIP: $ZIP"
unzip -q "$ZIP" -d "$TMP/src"

if ! grep -Eq '"version"[[:space:]]*:[[:space:]]*"12\.40\.6"' "$TMP/src/package.json"; then
  echo "❌ ZIP đã tải không phải bản V12.40.6."
  exit 1
fi

echo "🌐 Đang tải repository GitHub..."
git clone https://github.com/anhtuan-hash/catrich2798.git "$TMP/repo"

echo "🎨 Đang cập nhật trang chủ Avocado Raised..."
rsync -a --checksum --delete \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.vercel/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  "$TMP/src/" "$TMP/repo/"

cd "$TMP/repo"

if command -v gh >/dev/null 2>&1; then
  if ! gh auth status >/dev/null 2>&1; then
    echo "🔐 Hãy hoàn tất đăng nhập GitHub trong cửa sổ trình duyệt..."
    gh auth login --hostname github.com --git-protocol https --web
  fi
  gh auth setup-git >/dev/null
fi

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm install 22 >/dev/null
  nvm use 22 >/dev/null
fi

echo "🧪 Đang cài thư viện và kiểm tra V12.40.6..."
npm ci
npm run verify:v12.40.6

git config user.name >/dev/null 2>&1 || git config user.name 'Nguyen Anh Tuan'
git config user.email >/dev/null 2>&1 || git config user.email 'anhtuan@pek.edu.vn'
git add -A

if git diff --cached --quiet; then
  echo "✅ GitHub đã ở đúng V12.40.6, không cần cập nhật thêm."
  exit 0
fi

git commit -m 'Redesign homepage with Avocado Raised theme in V12.40.6'
git push origin HEAD:main

echo "✅ ĐÃ ĐƯA V12.40.6 LÊN GITHUB. VERCEL SẼ TỰ TRIỂN KHAI."
