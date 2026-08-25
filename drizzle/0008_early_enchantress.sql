CREATE TABLE `lapis_academic_record_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`queryText` text NOT NULL,
	`criteriaText` text NOT NULL,
	`sourcesJson` text NOT NULL,
	`resultCount` int NOT NULL,
	`resultsJson` longtext NOT NULL,
	`queriedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lapis_academic_record_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `lapis_record_searches_project_idx` ON `lapis_academic_record_searches` (`lapisProjectId`);--> statement-breakpoint
CREATE INDEX `lapis_record_searches_queried_idx` ON `lapis_academic_record_searches` (`queriedAt`);