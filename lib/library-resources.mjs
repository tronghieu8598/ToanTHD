import catalog from '../data/digital-library/catalog.json' with { type: 'json' };

export const bundledLibraryCatalog = catalog;
export const libraryUploadId = /^upload-[0-9a-f-]{36}$/;

export function resourceFitsRoom(resource, room) {
    const grade = Number(room.grade) || Number(room.label.trim().match(/^(10|11|12)(?!\d)/)?.[1]);
    return !grade || resource.grades.includes(grade);
}
