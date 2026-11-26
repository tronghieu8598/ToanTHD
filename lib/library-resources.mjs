import catalog from '../data/digital-library/catalog.json' with { type: 'json' };
import release from '../data/digital-library/generated/library-release.json' with { type: 'json' };

const builtInIds = new Set(catalog.map(item => item.id));
export const bundledLibraryCatalog = catalog;
export const releasedLibraryCatalog = release.resources.filter(item => !builtInIds.has(item.id));
export const libraryReleaseStatusPath = '/api/library-release/status';
export const libraryReleaseIdsKey = 'library_release_resource_ids';
export const libraryUploadId = /^upload-[0-9a-f-]{36}$/;

export function resourceFitsRoom(resource, room) {
    const grade = Number(room.grade) || Number(room.label.trim().match(/^(10|11|12)(?!\d)/)?.[1]);
    return !grade || resource.grades.includes(grade);
}
