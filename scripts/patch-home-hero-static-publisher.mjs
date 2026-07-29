import fs from 'node:fs';

const target = 'src/components/HomeHeroCmsEditor.jsx';
if (!fs.existsSync(target)) throw new Error(`Missing Hero editor source: ${target}`);

let source = fs.readFileSync(target, 'utf8');

if (!source.includes("GITHUB_HERO_TOKEN chưa được cấu hình")) {
  const anchor = "  if (/bucket/i.test(message) && /not found/i.test(message)) return 'Chưa có Storage bucket cho Hero. Cần chạy bản nâng cấp Supabase đi kèm.';";
  const replacement = `${anchor}\n  if (/GITHUB_HERO_TOKEN/i.test(message)) return 'GITHUB_HERO_TOKEN chưa được cấu hình trong Vercel. Chưa thể đưa Hero vào thư mục public/hero.';\n  if (/Hero media host is not allowed/i.test(message)) return 'Nguồn media này chưa được phép sao chép vào GitHub. Hãy tải tệp trực tiếp bằng nút Chọn tệp.';`;
  if (!source.includes(anchor)) throw new Error('Could not locate Hero editor error-message anchor.');
  source = source.replace(anchor, replacement);
}

const oldUploadMessage = `      setMessage({ tone: result.temporary ? 'warning' : 'success', text: result.temporary
        ? 'Đã tải để xem trước. Cần nâng cấp Supabase để tệp được chia sẻ cho mọi người.'
        : 'Đã tải tệp nền lên hệ thống.' });`;
const newUploadMessage = `      const savedPercent = result.optimized && result.originalBytes
        ? Math.max(0, Math.round((1 - result.outputBytes / result.originalBytes) * 100))
        : 0;
      setMessage({
        tone: result.temporary ? 'warning' : 'success',
        text: result.temporary
          ? 'Đã tải để xem trước trên thiết bị này. Cần Supabase Storage để giữ tệp bản nháp trước khi công bố.'
          : \`Đã lưu tệp vào khu vực bản nháp\${savedPercent ? \` và giảm \${savedPercent}% dung lượng\` : ''}. Khi công bố, hệ thống sẽ sao chép tệp vào public/hero/media và phân phối bằng Vercel CDN.\`,
      });`;
if (source.includes(oldUploadMessage)) source = source.replace(oldUploadMessage, newUploadMessage);

const oldPublish = `  const handlePublish = async () => {
    setBusy('publish');
    setMessage(null);
    try {
      const result = await publishHomeHero(config, currentUser);
      const normalized = normalizeHomeHeroConfig(config);
      onPublished?.(normalized);
      setMessage({
        tone: result.databaseReady ? 'success' : 'warning',
        text: result.databaseReady ? 'Hero mới đã được công bố.' : 'Hero đã được áp dụng trên trình duyệt này. Cần chạy SQL nâng cấp để công bố cho mọi người.',
      });
    } catch (error) {
      setMessage({ tone: 'error', text: sanitizeMessage(error) });
    } finally {
      setBusy('');
    }
  };`;
const newPublish = `  const handlePublish = async () => {
    setBusy('publish');
    setMessage(null);
    try {
      const result = await publishHomeHero(config, currentUser);
      const shortCommit = String(result.commitSha || '').slice(0, 7);
      setMessage({
        tone: 'success',
        text: \`Đã tạo commit\${shortCommit ? \` \${shortCommit}\` : ''}. Vercel đang triển khai Hero mới từ public/hero; Hero hiện tại được giữ nguyên cho đến khi deployment sẵn sàng.\`,
      });
    } catch (error) {
      setMessage({ tone: 'error', text: sanitizeMessage(error) });
    } finally {
      setBusy('');
    }
  };`;
if (!source.includes(newPublish)) {
  if (!source.includes(oldPublish)) throw new Error('Could not locate Hero publish handler.');
  source = source.replace(oldPublish, newPublish);
}

source = source.replace('JPG, PNG, WebP, GIF, APNG, MP4, WebM · tối đa 50 MB', 'JPG, PNG, WebP, GIF, APNG, MP4, WebM · tối đa 25 MB khi công bố static');
source = source.replace("databaseReady ? 'Có thể công bố cho toàn hệ thống' : 'Cần chạy SQL nâng cấp đi kèm'", "databaseReady ? 'Bản nháp được đồng bộ; công bố qua GitHub/Vercel' : 'Cần chạy SQL nâng cấp đi kèm'");

if (!source.includes('Vercel đang triển khai Hero mới từ public/hero')
  || !source.includes('public/hero/media')
  || !source.includes('tối đa 25 MB khi công bố static')) {
  throw new Error('Static Hero editor patch did not complete.');
}

fs.writeFileSync(target, source);
console.log('Hero editor now publishes versioned static assets through GitHub and Vercel.');
