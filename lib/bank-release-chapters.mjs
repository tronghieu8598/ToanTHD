// A release replaces only the canonical questions in its listed lessons.
export const bankReleaseChapters = {
    '12-C01': {
        grade: 12,
        documentId: 'dc-12-hk1-v4',
        lessons: [
            {folder: 'B01', id: 'dc-12-hk1-1D1-v4', count: 59},
            {folder: 'B02', id: 'dc-12-hk1-1D2-v4', count: 49},
            {folder: 'B03', id: 'dc-12-hk1-1D3-v4', count: 52},
            {folder: 'B04', id: 'dc-12-hk1-1D4-v4', count: 70},
        ],
    },
    '12-C02': {
        grade: 12,
        documentId: 'dc-12-hk1-v4',
        partial: true,
        approvedReviews: {
            'dc-12-hk1-2H1-q058-v4': {
                flag: 'conflicting-tf-solution',
                note: 'Giáo viên đã duyệt sửa nhãn lời giải ý b thành Đúng. Khóa đáp án giữ nguyên.',
            },
        },
        lessons: [
            {folder: 'B01', id: 'dc-12-hk1-2H1-v4', count: 107},
        ],
    },
    '12-C06': {
        grade: 12,
        documentId: 'dc-12-hk2-v4',
        lessons: [
            {folder: 'B01', id: 'dc-12-hk2-6D1-v4', count: 48},
            {folder: 'B02', id: 'dc-12-hk2-6D2-v4', count: 70},
        ],
    },
};
