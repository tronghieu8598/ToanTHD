import type { Metadata } from 'next';
import { bankReleaseChapters } from '../../../lib/bank-release-chapters.mjs';
import chapter01 from '../../../data/chapter-variants/generated/12-C01.json';
import chapter02 from '../../../data/chapter-variants/generated/12-C02.json';
import chapter03 from '../../../data/chapter-variants/generated/12-C03.json';
import chapter04 from '../../../data/chapter-variants/generated/12-C04.json';
import chapter05 from '../../../data/chapter-variants/generated/12-C05.json';
import chapter06 from '../../../data/chapter-variants/generated/12-C06.json';
import ReleasePanel, { type ChapterScope } from './release-panel';
import './release-panel.css';

export const metadata: Metadata = { title: 'Nạp ngân hàng câu hỏi · Toán THĐ' };

const variants = new Map([
    ['12-C01', chapter01.version], ['12-C02', chapter02.version], ['12-C03', chapter03.version],
    ['12-C04', chapter04.version], ['12-C05', chapter05.version], ['12-C06', chapter06.version],
]);
const scopes: ChapterScope[] = Object.entries(bankReleaseChapters).map(([code, chapter]) => ({
    code,
    grade: chapter.grade,
    documentId: chapter.documentId,
    variantsVersion: variants.get(code) ?? null,
    lessons: chapter.lessons.map(({ id, count }) => ({ id, count })),
}));

export default function Page() {
    return <ReleasePanel scopes={scopes} />;
}
