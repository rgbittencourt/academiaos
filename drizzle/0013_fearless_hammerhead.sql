CREATE TABLE `qualia_code_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`corpusId` int NOT NULL,
	`excerptId` int NOT NULL,
	`suggestedLabel` varchar(180) NOT NULL,
	`proposedTheme` varchar(255),
	`rationale` text NOT NULL,
	`evidence` text NOT NULL,
	`confidence` int NOT NULL,
	`status` enum('suggested','accepted','rejected') NOT NULL DEFAULT 'suggested',
	`researcherNote` text,
	`modelId` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qualia_code_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualia_coding_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`corpusId` int NOT NULL,
	`excerptId` int NOT NULL,
	`codeId` int NOT NULL,
	`coderLabel` varchar(180) NOT NULL,
	`decision` enum('applied','not_applied','uncertain') NOT NULL,
	`rationale` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qualia_coding_decisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `qualia_coding_decisions_unique` UNIQUE(`corpusId`,`excerptId`,`codeId`,`coderLabel`)
);
--> statement-breakpoint
CREATE TABLE `qualia_memos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`corpusId` int NOT NULL,
	`excerptId` int,
	`title` varchar(255) NOT NULL,
	`content` longtext NOT NULL,
	`memoType` enum('analytic','reflexive','methodological') NOT NULL DEFAULT 'analytic',
	`authorLabel` varchar(180) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qualia_memos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualia_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`corpusId` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`mediaType` enum('text','audio','image','video','document') NOT NULL,
	`storageKey` varchar(1000),
	`mediaUrl` text,
	`mimeType` varchar(180),
	`transcription` longtext,
	`researcherDescription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qualia_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `qualia_code_suggestions_corpus_idx` ON `qualia_code_suggestions` (`corpusId`);--> statement-breakpoint
CREATE INDEX `qualia_code_suggestions_excerpt_idx` ON `qualia_code_suggestions` (`excerptId`);--> statement-breakpoint
CREATE INDEX `qualia_code_suggestions_status_idx` ON `qualia_code_suggestions` (`status`);--> statement-breakpoint
CREATE INDEX `qualia_coding_decisions_corpus_idx` ON `qualia_coding_decisions` (`corpusId`);--> statement-breakpoint
CREATE INDEX `qualia_coding_decisions_excerpt_idx` ON `qualia_coding_decisions` (`excerptId`);--> statement-breakpoint
CREATE INDEX `qualia_memos_corpus_idx` ON `qualia_memos` (`corpusId`);--> statement-breakpoint
CREATE INDEX `qualia_memos_excerpt_idx` ON `qualia_memos` (`excerptId`);--> statement-breakpoint
CREATE INDEX `qualia_sources_corpus_idx` ON `qualia_sources` (`corpusId`);--> statement-breakpoint
CREATE INDEX `qualia_sources_media_type_idx` ON `qualia_sources` (`mediaType`);