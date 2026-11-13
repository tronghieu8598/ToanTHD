ALTER TABLE `attempts` ADD `save_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` ADD `last_seen_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` ADD `allow_rejoin` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `scoring_mode` text DEFAULT 'practice' NOT NULL;