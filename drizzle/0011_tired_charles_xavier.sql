CREATE TABLE `vault_data_dictionaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`datasetId` int NOT NULL,
	`variableName` varchar(180) NOT NULL,
	`variableType` enum('unknown','identifier','integer','number','text','boolean','date','categorical','other') NOT NULL DEFAULT 'unknown',
	`description` text NOT NULL,
	`allowedValuesJson` longtext NOT NULL,
	`units` varchar(180),
	`missingValueRule` varchar(500),
	`source` enum('manual','csv_header','cleaning_code') NOT NULL DEFAULT 'manual',
	`sourceDetail` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vault_data_dictionaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `vault_data_dictionaries_unique` UNIQUE(`datasetId`,`variableName`)
);
--> statement-breakpoint
CREATE TABLE `vault_dataset_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`datasetId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`changeSummary` varchar(500) NOT NULL,
	`snapshotJson` longtext NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vault_dataset_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `vault_dataset_versions_unique` UNIQUE(`datasetId`,`versionNumber`)
);
--> statement-breakpoint
CREATE TABLE `vault_governance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`datasetId` int NOT NULL,
	`humanSubjects` boolean NOT NULL DEFAULT false,
	`cepConepStatus` enum('not_applicable','planning','submitted','approved','amendment_required','closed') NOT NULL DEFAULT 'not_applicable',
	`approvalReference` varchar(255),
	`riskLevel` enum('not_assessed','minimal','moderate','high') NOT NULL DEFAULT 'not_assessed',
	`dataProcessingAgreementStatus` enum('not_applicable','pending','documented') NOT NULL DEFAULT 'not_applicable',
	`privacyImpactSummary` text,
	`pendingItemsJson` longtext NOT NULL,
	`lastReviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vault_governance_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `vault_governance_records_dataset_unique` UNIQUE(`datasetId`)
);
--> statement-breakpoint
CREATE TABLE `vault_repository_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`datasetId` int NOT NULL,
	`repository` enum('zenodo','dataverse','institutional') NOT NULL,
	`status` enum('draft','metadata_ready','manual_deposit','deposited','published','blocked') NOT NULL DEFAULT 'draft',
	`destinationUrl` text,
	`repositoryRecordId` varchar(255),
	`requirementsJson` longtext NOT NULL,
	`metadataSnapshotJson` longtext NOT NULL,
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vault_repository_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `vault_repository_plans_unique` UNIQUE(`datasetId`,`repository`)
);
--> statement-breakpoint
CREATE INDEX `vault_data_dictionaries_dataset_idx` ON `vault_data_dictionaries` (`datasetId`);--> statement-breakpoint
CREATE INDEX `vault_dataset_versions_dataset_idx` ON `vault_dataset_versions` (`datasetId`);--> statement-breakpoint
CREATE INDEX `vault_dataset_versions_user_idx` ON `vault_dataset_versions` (`createdByUserId`);--> statement-breakpoint
CREATE INDEX `vault_repository_plans_dataset_idx` ON `vault_repository_plans` (`datasetId`);--> statement-breakpoint
CREATE INDEX `vault_repository_plans_user_idx` ON `vault_repository_plans` (`createdByUserId`);