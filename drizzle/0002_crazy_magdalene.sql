CREATE TABLE `lapis_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`kind` enum('gaps','originality','grant','feasibility') NOT NULL,
	`status` enum('idle','generating','ready','error') NOT NULL DEFAULT 'idle',
	`content` text,
	`evidenceJson` text NOT NULL,
	`model` varchar(100),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lapis_analyses_id` PRIMARY KEY(`id`),
	CONSTRAINT `lapis_analyses_project_kind_unique` UNIQUE(`lapisProjectId`,`kind`)
);
--> statement-breakpoint
CREATE TABLE `lapis_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reviewProjectId` int,
	`title` varchar(180) NOT NULL,
	`researchIdea` text NOT NULL,
	`problemStatement` text,
	`researchQuestion` text,
	`targetAgency` varchar(180),
	`resources` text,
	`status` enum('draft','maturing','ready') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lapis_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `lapis_projects_user_idx` ON `lapis_projects` (`userId`);--> statement-breakpoint
CREATE INDEX `lapis_projects_review_idx` ON `lapis_projects` (`reviewProjectId`);