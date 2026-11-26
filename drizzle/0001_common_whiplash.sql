CREATE TABLE `mutation_log` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`created_at` integer NOT NULL,
	`summary` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mutation_log_revision_unique` ON `mutation_log` (`revision`);--> statement-breakpoint
CREATE TABLE `workspace_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `documents` ADD `parent_id` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `family_id` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `source_json` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `archived_at` integer;--> statement-breakpoint
ALTER TABLE `questions` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `roster_snapshot` text;--> statement-breakpoint
ALTER TABLE `students` ADD `archived_at` integer;