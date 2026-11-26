CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`submitted_at` integer,
	`earned` real,
	`score` real,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attempts_token_unique` ON `attempts` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_attempt_per_student` ON `attempts` (`session_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `classrooms` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`grade` integer NOT NULL,
	`school_year` text NOT NULL,
	`is_sample` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`grade` integer NOT NULL,
	`title` text NOT NULL,
	`edition` text NOT NULL,
	`is_sample` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`chapter` text NOT NULL,
	`title` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`original_number` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`kind` text NOT NULL,
	`prompt` text NOT NULL,
	`choices` text NOT NULL,
	`correct` text NOT NULL,
	`solution` text NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_source_version` ON `questions` (`lesson_id`,`original_number`,`revision`);--> statement-breakpoint
CREATE TABLE `session_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`position` integer NOT NULL,
	`source_id` text NOT NULL,
	`snapshot` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_question_position` ON `session_questions` (`session_id`,`position`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`classroom_id` text NOT NULL,
	`mode` text NOT NULL,
	`minutes` integer NOT NULL,
	`state` text NOT NULL,
	`created_at` integer NOT NULL,
	`closes_at` integer NOT NULL,
	FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_code_unique` ON `sessions` (`code`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`classroom_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_ordinal` ON `students` (`classroom_id`,`ordinal`);