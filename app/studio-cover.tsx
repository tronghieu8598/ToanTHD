import { ArrowRight, BookOpen, FileText, FlaskConical, FolderArchive, Headphones } from 'lucide-react';
import { normalizeLibraryText, resourceKinds, type LibraryResource, type ResourceKind } from '../lib/client/library-catalog';

const icons = { lesson: FlaskConical, book: BookOpen, document: FileText, elearning: Headphones, archive: FolderArchive };
const tones = ['green', 'blue', 'orange'];

function visual(kind: ResourceKind, chapter: string) {
    if (kind === 'book') return 'book';
    if (kind === 'document') return 'pages';
    if (kind === 'elearning') return 'sequence';
    if (kind !== 'lesson') return null;
    const subject = normalizeLibraryText(chapter);
    if (/nguyen ham|tich phan/.test(subject)) return 'integral';
    if (/dao ham|khao sat|cuc tri/.test(subject)) return 'surface';
    if (/day so|cap so/.test(subject)) return 'sequence';
    if (/phan tan|mau so lieu|thong ke/.test(subject)) return 'bars';
    if (/vecto|toa do trong khong gian/.test(subject)) return 'torus';
    return null;
}

export function StudioCover({ kind, chapter = '', cover, arrow = false }: Pick<LibraryResource, 'kind' | 'cover'> & {
    chapter?: string;
    arrow?: boolean;
}) {
    const Icon = icons[kind];
    const number = Number(chapter.match(/\d+/)?.[0]) || 1;
    const tone = kind === 'book' ? 'blue' : kind === 'document' || kind === 'archive' ? 'orange' : tones[(number - 1) % 3];
    const asset = visual(kind, chapter);
    const source = cover || (asset && `/studio/${asset}.webp`);
    return <span className={`studio-cover tone-${tone}${cover ? ' studio-cover-source' : ''}`} aria-hidden="true">
        {source ? <img src={source} alt="" loading="lazy" /> : <Icon className="studio-cover-symbol" size={58} strokeWidth={1.4} />}
        {arrow && <span className="studio-cover-arrow"><ArrowRight size={16} /></span>}
    </span>;
}

export function resourceMeta(resource: LibraryResource) {
    return [resource.grade ? `Toán ${resource.grade}` : 'Toán 10–12', resourceKinds[resource.kind]].join(' · ');
}
