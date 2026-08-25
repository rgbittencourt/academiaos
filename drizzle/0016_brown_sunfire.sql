CREATE TABLE `article_duplicate_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`articleIdA` int NOT NULL,
	`articleIdB` int NOT NULL,
	`similarityScore` int NOT NULL,
	`decision` enum('same_study','distinct') NOT NULL,
	`reviewerNote` text,
	`reviewedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `article_duplicate_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `article_duplicate_reviews_project_pair_unique` UNIQUE(`projectId`,`articleIdA`,`articleIdB`)
);
--> statement-breakpoint
CREATE INDEX `article_duplicate_reviews_project_idx` ON `article_duplicate_reviews` (`projectId`);