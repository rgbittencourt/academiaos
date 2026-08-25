CREATE TABLE `article_screenings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`articleId` int NOT NULL,
	`stage` enum('title_abstract','full_text') NOT NULL DEFAULT 'title_abstract',
	`decision` enum('pending','included','excluded') NOT NULL DEFAULT 'pending',
	`reason` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `article_screenings_id` PRIMARY KEY(`id`),
	CONSTRAINT `article_screenings_project_article_unique` UNIQUE(`projectId`,`articleId`)
);
--> statement-breakpoint
CREATE TABLE `lapis_methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`studyDesign` varchar(180),
	`setting` text,
	`population` text,
	`sampling` text,
	`inclusionCriteria` text,
	`exclusionCriteria` text,
	`variables` text,
	`dataCollection` text,
	`analysisPlan` text,
	`ethicsConsiderations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lapis_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `lapis_methods_project_unique` UNIQUE(`lapisProjectId`)
);
--> statement-breakpoint
CREATE TABLE `lapis_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`status` enum('planned','in_progress','done') NOT NULL DEFAULT 'planned',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lapis_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `narrative_themes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`interpretation` text NOT NULL,
	`articleIdsJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `narrative_themes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `article_screenings_project_idx` ON `article_screenings` (`projectId`);--> statement-breakpoint
CREATE INDEX `lapis_milestones_project_idx` ON `lapis_milestones` (`lapisProjectId`);--> statement-breakpoint
CREATE INDEX `narrative_themes_project_idx` ON `narrative_themes` (`projectId`);