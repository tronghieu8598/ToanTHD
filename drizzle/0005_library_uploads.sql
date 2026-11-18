CREATE TABLE library_uploads (
    id TEXT PRIMARY KEY NOT NULL,
    owner_key TEXT NOT NULL,
    title TEXT NOT NULL,
    grade INTEGER NOT NULL CHECK (grade IN (10,11,12)),
    chapter_number INTEGER NOT NULL CHECK (chapter_number BETWEEN 1 AND 9 AND (grade != 12 OR chapter_number <= 6)),
    visibility TEXT NOT NULL CHECK (visibility IN ('private','team')),
    mime TEXT NOT NULL,
    filename TEXT NOT NULL,
    byte_length INTEGER NOT NULL CHECK (byte_length BETWEEN 1 AND 5000000),
    created_at INTEGER NOT NULL,
    deleted_at INTEGER,
    deleted_by TEXT,
    revision INTEGER NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE INDEX library_uploads_owner ON library_uploads(owner_key, deleted_at, created_at);
--> statement-breakpoint
CREATE INDEX library_uploads_visibility ON library_uploads(visibility, deleted_at, created_at);
--> statement-breakpoint
CREATE TABLE library_upload_chunks (
    upload_id TEXT NOT NULL REFERENCES library_uploads(id),
    position INTEGER NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (upload_id, position)
);
