CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blank_interval` int NOT NULL DEFAULT 3,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`admin_id` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`target_table` varchar(100),
	`target_id` int,
	`detail` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memorization_passages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`week_id` int NOT NULL,
	`book` varchar(50) NOT NULL,
	`chapter_verse` varchar(20) NOT NULL,
	`content` text NOT NULL,
	`display_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memorization_passages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memorization_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`passage_id` int NOT NULL,
	`score` decimal(5,2),
	`correct_count` int NOT NULL DEFAULT 0,
	`wrong_count` int NOT NULL DEFAULT 0,
	`missing_count` int NOT NULL DEFAULT 0,
	`test_snapshot` json,
	`completed_at` timestamp,
	CONSTRAINT `memorization_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memorization_test_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`scope_week_id` int NOT NULL,
	`test_type` enum('full_recite','fill_blank','full_input') NOT NULL,
	`total_passages` int NOT NULL,
	`average_score` decimal(5,2),
	`status` enum('in_progress','completed') NOT NULL DEFAULT 'in_progress',
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `memorization_test_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `training_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`record_date` date NOT NULL,
	`meditation_completed` boolean NOT NULL DEFAULT false,
	`prayer_minutes` int NOT NULL DEFAULT 0,
	`reading_pages` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `training_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_user_date` UNIQUE(`user_id`,`record_date`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('member','admin') NOT NULL DEFAULT 'member',
	`profile_image` varchar(500),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `weekly_training_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`week_id` int NOT NULL,
	`inductive_study_completed` boolean NOT NULL DEFAULT false,
	`book_reading_completed` boolean NOT NULL DEFAULT false,
	`preview_completed` boolean NOT NULL DEFAULT false,
	`sunday_service_completed` boolean NOT NULL DEFAULT false,
	`friday_service_completed` boolean NOT NULL DEFAULT false,
	`small_group_completed` boolean NOT NULL DEFAULT false,
	`memorization_completed` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_training_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_user_week` UNIQUE(`user_id`,`week_id`)
);
--> statement-breakpoint
CREATE TABLE `weeks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`week_number` int NOT NULL,
	`week_start` date NOT NULL,
	`week_end` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weeks_id` PRIMARY KEY(`id`),
	CONSTRAINT `weeks_week_number_unique` UNIQUE(`week_number`),
	CONSTRAINT `weeks_week_start_unique` UNIQUE(`week_start`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_admin_id_users_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memorization_passages` ADD CONSTRAINT `memorization_passages_week_id_weeks_id_fk` FOREIGN KEY (`week_id`) REFERENCES `weeks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memorization_results` ADD CONSTRAINT `memorization_results_session_id_memorization_test_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `memorization_test_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memorization_results` ADD CONSTRAINT `memorization_results_passage_id_memorization_passages_id_fk` FOREIGN KEY (`passage_id`) REFERENCES `memorization_passages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memorization_test_sessions` ADD CONSTRAINT `memorization_test_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memorization_test_sessions` ADD CONSTRAINT `memorization_test_sessions_scope_week_id_weeks_id_fk` FOREIGN KEY (`scope_week_id`) REFERENCES `weeks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_records` ADD CONSTRAINT `training_records_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weekly_training_records` ADD CONSTRAINT `weekly_training_records_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weekly_training_records` ADD CONSTRAINT `weekly_training_records_week_id_weeks_id_fk` FOREIGN KEY (`week_id`) REFERENCES `weeks`(`id`) ON DELETE no action ON UPDATE no action;