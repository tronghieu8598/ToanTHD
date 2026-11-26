import { bundledLibraryCatalog as catalog, releasedLibraryCatalog as released } from '../library-resources.mjs';
import curriculum from '../../data/curriculum/kntt-math.json';
import cards from '../../data/digital-library/generated/items.json';

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
    preview?: { src: string; durationSeconds: number };
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

type EditableCard = Pick<LibraryResource, 'title' | 'description' | 'chapterNumber' | 'cover' | 'preview'>;
function toResource(item: (typeof catalog | typeof released)[number]): LibraryResource {
    const edited = (cards as Partial<Record<string, EditableCard>>)[item.id];
    if (edited) return {...item, ...edited, kind: item.kind as ResourceKind};
    const fromFolder = Number(normalizeLibraryText(item.chapter).match(/^(?:c|chuong)\s*(\d+)\b/)?.[1]);
    return {...item, kind: item.kind as ResourceKind, chapterNumber: fromFolder || undefined, cover: `/studio/covers/${item.id}.jpg`};
}
export const libraryResources = catalog.map(toResource);
export const releasedLibraryResources = released.map(toResource);
export const libraryById = new Map([...libraryResources, ...releasedLibraryResources].map(resource => [resource.id, resource]));

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
