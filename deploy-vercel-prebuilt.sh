#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

printf '\nBrian English Studio — production deployment\n'
printf 'Repository: %s\n\n' "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo 'Lỗi: chưa cài Node.js 22.x.' >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" != "22" ]; then
  printf 'Cảnh báo: dự án yêu cầu Node.js 22.x, hiện đang là %s.\n' "$(node -v)" >&2
fi

if ! command -v git >/dev/null 2>&1; then
  echo 'Lỗi: chưa cài Git.' >&2
  exit 1
fi

if [ ! -d .git ]; then
  echo 'Lỗi: hãy chạy script trong thư mục repository catrich2798.' >&2
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" != "main" ]; then
  printf 'Đang chuyển từ nhánh %s sang main...\n' "$CURRENT_BRANCH"
  git checkout main
fi

echo 'Đang đồng bộ mã nguồn mới nhất từ GitHub...'
git pull --ff-only origin main

echo 'Đang cài dependencies...'
npm ci

echo 'Đang kiểm tra tài khoản Vercel...'
if ! npx --yes vercel@latest whoami >/dev/null 2>&1; then
  echo 'Bạn chưa đăng nhập Vercel. Trình đăng nhập sẽ mở ngay bây giờ.'
  npx --yes vercel@latest login
fi

if [ ! -f .vercel/project.json ]; then
  echo 'Thư mục này chưa liên kết với dự án Vercel.'
  echo 'Hãy chọn đúng team và dự án Brian hiện có trong các câu hỏi tiếp theo.'
  npx --yes vercel@latest link
fi

echo 'Đang tải Project Settings và biến môi trường production...'
npx --yes vercel@latest pull --yes --environment=production

echo 'Đang build production ngay trên máy này...'
npx --yes vercel@latest build --prod

echo 'Đang upload bản build sẵn lên production...'
DEPLOYMENT_URL="$(npx --yes vercel@latest deploy --prebuilt --prod)"

printf '\n✅ DEPLOY THÀNH CÔNG\n%s\n\n' "$DEPLOYMENT_URL"
