# Triển khai V11.5.9

## Cài bản update-only

```bash
cd ~/Documents/Brian-English-Studio-MAIN
rm -rf /tmp/brian-v1159
mkdir -p /tmp/brian-v1159
unzip -q ~/Downloads/brian-english-studio-v11.5.9-burs-comfortable-update-only.zip -d /tmp/brian-v1159
INSTALLER=$(find /tmp/brian-v1159 -name "install-v11.5.9.mjs" | head -n 1)
node "$INSTALLER" "$PWD"
```

## Kiểm tra

```bash
npm ci
npm run verify:v11.5.9
```

## Deploy

```bash
git add -A
git commit -m "Apply BURS Comfortable V11.5.9"
git pull --rebase origin main
git push origin main
```

Không chạy SQL. Sau khi Vercel Ready, dùng `Command + Shift + R`.

## Kiểm tra trực quan sau deploy

Kiểm tra 100%, 110%, 120%, 130% tại:

- 1440 hoặc lớn hơn.
- 1280.
- 1024.
- 768.
- Khoảng 390 px.

Ưu tiên các route: Apps, Settings, AI Workspace, Grammar Builder, Writing Studio, Pronunciation Coach, Worksheet Factory, AI Lesson Integration, Department, Homeroom và Resource Library.
