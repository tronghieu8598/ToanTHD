import DigitalLibrary from '../digital-library';
export const metadata = {
  title: 'Học liệu số | Toán THĐ',
  description: 'Kho bài giảng HTML, SGK tương tác và tài liệu số Toán 10–12',
};
export default function DigitalLibraryPage() {
  return <div className="dl-public-page">
    <div className="dl-public-top"><a href="/" aria-label="Về ToanTHD"><span className="dl-logo-mark">∑</span><b>Toán THĐ</b></a><span>THƯ VIỆN SỐ · THPT TRỊNH HOÀI ĐỨC</span><a href="/">Về trang chính ↗</a></div>
    <main className="dl-public-content"><DigitalLibrary /></main>
  </div>;
}
