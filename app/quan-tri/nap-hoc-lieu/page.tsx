import type { Metadata } from 'next';
import LibraryReleasePanel from './library-release-panel';
import '../nap-ngan-hang/release-panel.css';

export const metadata: Metadata = { title: 'Nạp học liệu · Toán THĐ' };

export default function Page() {
    return <LibraryReleasePanel />;
}
