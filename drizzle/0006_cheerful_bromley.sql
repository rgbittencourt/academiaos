CREATE TABLE `analyst_plan_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analystPlanId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`snapshotJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyst_plan_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `analyst_plan_versions_unique` UNIQUE(`analystPlanId`,`versionNumber`)
);
--> statement-breakpoint
CREATE TABLE `analyst_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`researchQuestion` text NOT NULL,
	`outcomeName` varchar(255) NOT NULL,
	`outcomeType` enum('continuous','binary','count','ordinal','time_to_event') NOT NULL,
	`predictors` text NOT NULL,
	`design` text,
	`missingDataPlan` text,
	`recommendation` text NOT NULL,
	`rationale` text NOT NULL,
	`assumptions` text NOT NULL,
	`rCode` longtext NOT NULL,
	`pythonCode` longtext NOT NULL,
	`graphPlan` text NOT NULL,
	`resultsTemplate` text NOT NULL,
	`versionNumber` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analyst_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `analyst_plans_project_unique` UNIQUE(`lapisProjectId`)
);
--> statement-breakpoint
CREATE TABLE `qualia_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`corpusId` int NOT NULL,
	`parentCodeId` int,
	`label` varchar(180) NOT NULL,
	`definition` text NOT NULL,
	`color` varchar(20) NOT NULL DEFAULT '#B45309',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qualia_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualia_corpora` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`sourceScope` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qualia_corpora_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualia_excerpts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`corpusId` int NOT NULL,
	`codeId` int,
	`sourceLabel` varchar(255) NOT NULL,
	`content` longtext NOT NULL,
	`analyticMemo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qualia_excerpts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scriptorium_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`targetJournal` varchar(255),
	`abstract` text,
	`sectionsJson` longtext NOT NULL,
	`status` enum('draft','review','ready') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scriptorium_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `scriptorium_documents_project_unique` UNIQUE(`lapisProjectId`)
);
--> statement-breakpoint
CREATE TABLE `scriptorium_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`changeSummary` varchar(500) NOT NULL,
	`snapshotJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scriptorium_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `scriptorium_versions_unique` UNIQUE(`documentId`,`versionNumber`)
);
--> statement-breakpoint
CREATE TABLE `vault_datasets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`dataType` enum('tabular','qualitative','image','audio','other') NOT NULL,
	`storageLocation` text,
	`persistentIdentifier` varchar(500),
	`license` varchar(255),
	`accessLevel` enum('open','restricted','controlled','private') NOT NULL DEFAULT 'private',
	`containsPersonalData` boolean NOT NULL DEFAULT false,
	`lawfulBasis` text,
	`consentStatus` enum('not_applicable','pending','documented','withdrawn') NOT NULL DEFAULT 'not_applicable',
	`anonymizationPlan` text,
	`retentionPolicy` text,
	`metadataJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vault_datasets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `analyst_plan_versions_plan_idx` ON `analyst_plan_versions` (`analystPlanId`);--> statement-breakpoint
CREATE INDEX `qualia_codes_corpus_idx` ON `qualia_codes` (`corpusId`);--> statement-breakpoint
CREATE INDEX `qualia_codes_parent_idx` ON `qualia_codes` (`parentCodeId`);--> statement-breakpoint
CREATE INDEX `qualia_corpora_project_idx` ON `qualia_corpora` (`lapisProjectId`);--> statement-breakpoint
CREATE INDEX `qualia_excerpts_corpus_idx` ON `qualia_excerpts` (`corpusId`);--> statement-breakpoint
CREATE INDEX `qualia_excerpts_code_idx` ON `qualia_excerpts` (`codeId`);--> statement-breakpoint
CREATE INDEX `scriptorium_versions_document_idx` ON `scriptorium_versions` (`documentId`);--> statement-breakpoint
CREATE INDEX `vault_datasets_project_idx` ON `vault_datasets` (`lapisProjectId`);