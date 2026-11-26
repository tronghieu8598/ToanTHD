ALTER TABLE `sessions` ADD `requires_entry_code` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `student_entry_codes` (
    `session_id` text NOT NULL REFERENCES `sessions`(`id`) ON DELETE CASCADE,
    `ordinal` integer NOT NULL,
    `code_hash` text NOT NULL,
    `expires_at` integer NOT NULL,
    PRIMARY KEY (`session_id`, `ordinal`)
);
--> statement-breakpoint
CREATE TABLE `student_entry_failures` (
    `session_id` text NOT NULL REFERENCES `sessions`(`id`) ON DELETE CASCADE,
    `ordinal` integer NOT NULL,
    `failure_count` integer NOT NULL,
    `window_ends_at` integer NOT NULL,
    PRIMARY KEY (`session_id`, `ordinal`)
);
