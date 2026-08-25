CREATE TABLE `analyst_visualizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analystPlanId` int NOT NULL,
	`kind` enum('distribution','comparison','relationship','effect','survival') NOT NULL,
	`title` varchar(255) NOT NULL,
	`dataSourceDescription` text NOT NULL,
	`specJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analyst_visualizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matchmaker_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`manuscriptTitle` varchar(255) NOT NULL,
	`scopeSummary` text NOT NULL,
	`rankedVenuesJson` longtext NOT NULL,
	`targetVenue` varchar(255),
	`coverLetter` longtext,
	`checklistJson` longtext NOT NULL,
	`reviewerCommentsJson` longtext NOT NULL,
	`responseDraftJson` longtext NOT NULL,
	`status` enum('planning','submitted','revision','accepted') NOT NULL DEFAULT 'planning',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matchmaker_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `matchmaker_submissions_project_unique` UNIQUE(`lapisProjectId`)
);
--> statement-breakpoint
CREATE TABLE `scriptorium_substance_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`checklistJson` longtext NOT NULL,
	`findingsJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scriptorium_substance_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scriptorium_zotero_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`libraryId` varchar(64) NOT NULL,
	`libraryType` enum('user','group') NOT NULL DEFAULT 'user',
	`encryptedApiKey` longtext NOT NULL,
	`keyHint` varchar(12) NOT NULL,
	`syncStatus` enum('connected','error','disconnected') NOT NULL DEFAULT 'connected',
	`lastSyncedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scriptorium_zotero_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `scriptorium_zotero_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `scriptorium_zotero_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`itemKey` varchar(64) NOT NULL,
	`title` text NOT NULL,
	`citationKey` varchar(255),
	`creatorsJson` text NOT NULL,
	`publicationYear` int,
	`doi` varchar(255),
	`sourceUrl` text,
	`itemType` varchar(120),
	`sourceUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scriptorium_zotero_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `scriptorium_zotero_item_unique` UNIQUE(`userId`,`itemKey`)
);
--> statement-breakpoint
CREATE TABLE `vault_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`datasetId` int NOT NULL,
	`originalFilename` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` text NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`byteSize` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`personalDataCategory` enum('none','identifiable','sensitive','pseudonymized','anonymized') NOT NULL,
	`processingPurpose` text NOT NULL,
	`lawfulBasis` text,
	`consentReference` varchar(255),
	`consentConfirmed` boolean NOT NULL DEFAULT false,
	`uploadedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vault_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vigil_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`documentId` int,
	`integrityChecklistJson` longtext NOT NULL,
	`referenceAlertsJson` longtext NOT NULL,
	`supplementaryJson` longtext NOT NULL,
	`disseminationJson` longtext NOT NULL,
	`status` enum('draft','review','monitoring') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vigil_assessments_id` PRIMARY KEY(`id`),
	CONSTRAINT `vigil_assessments_project_unique` UNIQUE(`lapisProjectId`)
);
--> statement-breakpoint
CREATE INDEX `analyst_visualizations_plan_idx` ON `analyst_visualizations` (`analystPlanId`);--> statement-breakpoint
CREATE INDEX `scriptorium_substance_reviews_document_idx` ON `scriptorium_substance_reviews` (`documentId`);--> statement-breakpoint
CREATE INDEX `scriptorium_zotero_items_user_idx` ON `scriptorium_zotero_items` (`userId`);--> statement-breakpoint
CREATE INDEX `vault_files_dataset_idx` ON `vault_files` (`datasetId`);--> statement-breakpoint
CREATE INDEX `vault_files_user_idx` ON `vault_files` (`uploadedByUserId`);