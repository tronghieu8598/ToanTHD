ALTER TABLE questions ADD COLUMN bank_status text NOT NULL DEFAULT 'auto';
--> statement-breakpoint
ALTER TABLE questions ADD COLUMN bank_origin text;
--> statement-breakpoint
ALTER TABLE questions ADD COLUMN bank_tex text;
--> statement-breakpoint
ALTER TABLE questions ADD COLUMN bank_meta text;
--> statement-breakpoint
ALTER TABLE questions ADD COLUMN bank_note text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE questions ADD COLUMN bank_search text NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE INDEX questions_family_revision ON questions(family_id,revision);
--> statement-breakpoint
CREATE INDEX questions_lesson_number ON questions(lesson_id,original_number);

--> statement-breakpoint
ALTER TABLE questions ADD COLUMN bank_fingerprint text;
