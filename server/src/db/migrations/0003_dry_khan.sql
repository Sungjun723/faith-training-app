CREATE TABLE `daily_meditations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`title` varchar(300) NOT NULL,
	`verse` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_meditations_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_meditations_date_unique` UNIQUE(`date`)
);
