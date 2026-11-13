CREATE TABLE teacher_accounts (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    auth_epoch TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
    must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0,1)),
    permissions TEXT NOT NULL DEFAULT '{}',
    allowed_class_ids TEXT NOT NULL DEFAULT '[]',
    selected_class_ids TEXT,
    revision INTEGER NOT NULL DEFAULT 1
);
--> statement-breakpoint
ALTER TABLE sessions ADD COLUMN owner_teacher_id TEXT REFERENCES teacher_accounts(id);
--> statement-breakpoint
CREATE INDEX sessions_teacher_class ON sessions(owner_teacher_id, classroom_id, created_at);
--> statement-breakpoint
CREATE TABLE saved_exams (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('online','paper')),
    minutes INTEGER NOT NULL CHECK (minutes BETWEEN 1 AND 180),
    scoring_mode TEXT NOT NULL CHECK (scoring_mode IN ('practice','exam-1246')),
    owner_teacher_id TEXT REFERENCES teacher_accounts(id),
    created_at INTEGER NOT NULL,
    archived_at INTEGER
);
--> statement-breakpoint
CREATE TABLE saved_exam_questions (
    exam_id TEXT NOT NULL REFERENCES saved_exams(id),
    position INTEGER NOT NULL,
    source_id TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    PRIMARY KEY (exam_id, position)
);
