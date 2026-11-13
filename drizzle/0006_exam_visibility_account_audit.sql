ALTER TABLE saved_exams ADD COLUMN visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN ('private','team'));
--> statement-breakpoint
ALTER TABLE saved_exams ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
CREATE INDEX saved_exams_owner_visibility ON saved_exams(owner_teacher_id,visibility,archived_at);
--> statement-breakpoint
CREATE TABLE account_audit (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    account_username TEXT NOT NULL,
    actor TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    actions TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX account_audit_created ON account_audit(created_at DESC,id);
