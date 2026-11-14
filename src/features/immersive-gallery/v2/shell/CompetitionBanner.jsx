const bannerSrc = '/museum/branding/contest-banner.jpg';
const lessonTitle = 'OUR CLIMATE ACTION MUSEUM';
const awardLabel = 'BÀI DỰ THI';
const credits = 'BÀI DỰ THI. Hội thi thiết kế chủ đề dạy học STEM/STEAM, chủ đề dạy học số. Cấp thành phố · Năm học 2026–2027. Lĩnh vực dự thi: Chủ đề số. Our Climate Action Museum. Môn học: Tiếng Anh · Lớp: 11 – Global Success, Unit 5: Global Warming · Thời lượng: 02 tiết × 45 phút. GV thực hiện: Thạc sĩ Nguyễn Anh Tuấn.';

export default function CompetitionBanner() {
  return (
    <header className="contest contest-art" data-testid="igv2-competition-banner" lang="vi"
      aria-label={awardLabel + ' – ' + lessonTitle}>
      <img src={bannerSrc} alt={credits} width={2116} height={463} />
    </header>
  );
}
