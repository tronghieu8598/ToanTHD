import { bundledLibraryCatalog as catalog } from '../library-resources.mjs';
import curriculum from '../../data/curriculum/kntt-math.json';
import montyPilot from '../../data/digital-library/generated/monty-hall.json';

export type ResourceKind = 'lesson' | 'book' | 'document' | 'elearning' | 'archive';
export type MathGrade = 10 | 11 | 12;
export const mathGrades: MathGrade[] = [10, 11, 12];
export const chapterRoman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
export const mathChapters = (grade: MathGrade) => curriculum[grade];
export type LibraryVisibility = 'private' | 'team';

export type LibraryResource = {
    id: string;
    title: string;
    kind: ResourceKind;
    grade: number | null;
    grades: number[];
    chapter: string;
    chapterNumber?: number;
    url: string;
    sourcePath: string;
    bytes: number;
    offline: boolean;
    description: string;
    cover?: string;
    upload?: {
        visibility: LibraryVisibility;
        owned: boolean;
        canManage: boolean;
        ownerName: string;
        filename: string;
        mime: string;
        revision: number;
        deletedAt: number | null;
        restorePrivate: boolean;
    };
};

// The source labels are retained for search; the publisher taxonomy drives navigation.
export const libraryResources: LibraryResource[] = catalog.map(item => {
    if (item.id === montyPilot.resource.id) return {...item, ...montyPilot.resource, kind: item.kind as ResourceKind};
    const fromFolder = Number(normalizeLibraryText(item.chapter).match(/^(?:c|chuong)\s*(\d+)\b/)?.[1]);
    const chapterNumber = item.id === '12-phong-thi-nghiem-toi-uu-bang-dao-57a0923' ? 1 : fromFolder || undefined;
    const coverId = item.kind === 'archive' ? '11-index-38727bd' : item.id;
    const title = item.id === '12-ung-dung-tich-phan-fb504a8' ? 'Ứng dụng tích phân · Bản gốc'
        : item.id === '12-lop-12-cong-cu-mo-phong-tinh-die-f4bf074' ? 'Mô phỏng diện tích và thể tích · Bản 2' : item.title;
    return {...item, title, kind: item.kind as ResourceKind, chapterNumber, cover: `/studio/covers/${coverId}.jpg`};
});
export const libraryById = new Map(libraryResources.map(resource => [resource.id, resource]));

export const resourceKinds: Record<ResourceKind, string> = {
    lesson: 'Bài giảng tương tác',
    book: 'SGK tương tác',
    elearning: 'E-learning',
    document: 'Tài liệu',
    archive: 'Gói tài nguyên',
};

export function normalizeLibraryText(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
}
