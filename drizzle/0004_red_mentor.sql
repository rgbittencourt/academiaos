CREATE TABLE `article_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`articleId` int NOT NULL,
	`originalFilename` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` text NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`byteSize` int NOT NULL,
	`pageCount` int,
	`extractionStatus` enum('pending','ready','error') NOT NULL DEFAULT 'pending',
	`fullText` longtext,
	`errorMessage` text,
	`extractedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `article_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `article_documents_article_unique` UNIQUE(`articleId`)
);
--> statement-breakpoint
CREATE TABLE `grant_opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('cnpq','capes') NOT NULL,
	`sourceUrl` text NOT NULL,
	`sourceKey` varchar(512) NOT NULL,
	`title` text NOT NULL,
	`summaryLiteral` text,
	`statusLabel` varchar(160),
	`publishedAt` timestamp,
	`deadlineAt` timestamp,
	`sourceFetchedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grant_opportunities_id` PRIMARY KEY(`id`),
	CONSTRAINT `grant_opportunities_source_unique` UNIQUE(`provider`,`sourceKey`)
);
--> statement-breakpoint
CREATE TABLE `lapis_grant_selections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`grantOpportunityId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lapis_grant_selections_id` PRIMARY KEY(`id`),
	CONSTRAINT `lapis_grant_selections_unique` UNIQUE(`lapisProjectId`,`grantOpportunityId`)
);
--> statement-breakpoint
CREATE TABLE `lapis_manuscripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`abstract` text,
	`keywords` text,
	`sectionsJson` longtext NOT NULL,
	`status` enum('draft','review','ready') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lapis_manuscripts_id` PRIMARY KEY(`id`),
	CONSTRAINT `lapis_manuscripts_project_unique` UNIQUE(`lapisProjectId`)
);
--> statement-breakpoint
CREATE INDEX `article_documents_project_idx` ON `article_documents` (`projectId`);--> statement-breakpoint
CREATE INDEX `grant_opportunities_provider_idx` ON `grant_opportunities` (`provider`);--> statement-breakpoint
CREATE INDEX `lapis_grant_selections_project_idx` ON `lapis_grant_selections` (`lapisProjectId`);