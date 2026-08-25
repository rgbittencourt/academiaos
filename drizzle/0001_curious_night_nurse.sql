CREATE TABLE `article_extractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`objective` text NOT NULL,
	`methodology` text NOT NULL,
	`sample` text NOT NULL,
	`mainFindings` text NOT NULL,
	`limitations` text NOT NULL,
	`evidenceJson` text NOT NULL,
	`model` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `article_extractions_id` PRIMARY KEY(`id`),
	CONSTRAINT `article_extractions_article_unique` UNIQUE(`articleId`)
);
--> statement-breakpoint
CREATE TABLE `project_syntheses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`status` enum('idle','generating','ready','error') NOT NULL DEFAULT 'idle',
	`content` text,
	`citationsJson` text NOT NULL,
	`model` varchar(100),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_syntheses_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_syntheses_project_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `review_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`researchQuestion` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`source` enum('semantic_scholar','openalex') NOT NULL,
	`title` text NOT NULL,
	`authorsJson` text NOT NULL,
	`publicationYear` int,
	`abstract` text,
	`doi` varchar(255),
	`citationCount` int NOT NULL DEFAULT 0,
	`relevanceScore` int NOT NULL,
	`sourceUrl` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`savedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_articles_project_external_unique` UNIQUE(`projectId`,`externalId`)
);
--> statement-breakpoint
CREATE INDEX `review_projects_user_idx` ON `review_projects` (`userId`);--> statement-breakpoint
CREATE INDEX `saved_articles_project_idx` ON `saved_articles` (`projectId`);