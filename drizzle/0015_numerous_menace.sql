CREATE TABLE `literature_import_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`source` enum('reticula') NOT NULL,
	`format` enum('ris') NOT NULL,
	`originalFilename` varchar(255) NOT NULL,
	`contentHash` varchar(64) NOT NULL,
	`totalRecords` int NOT NULL,
	`candidateRecords` int NOT NULL,
	`duplicateRecords` int NOT NULL,
	`selectedRecords` int NOT NULL,
	`provenanceJson` text NOT NULL,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `literature_import_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `saved_articles` MODIFY COLUMN `source` enum('semantic_scholar','openalex','europe_pmc','pubmed','crossref','scielo','openaire','arxiv','core','reticula') NOT NULL;--> statement-breakpoint
ALTER TABLE `saved_articles` ADD `importBatchId` int;--> statement-breakpoint
CREATE INDEX `literature_import_batches_project_idx` ON `literature_import_batches` (`projectId`);--> statement-breakpoint
CREATE INDEX `literature_import_batches_project_imported_idx` ON `literature_import_batches` (`projectId`,`importedAt`);--> statement-breakpoint
CREATE INDEX `saved_articles_import_batch_idx` ON `saved_articles` (`importBatchId`);