CREATE TABLE `analyst_notebooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analystPlanId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`language` enum('r','python') NOT NULL,
	`title` varchar(255) NOT NULL,
	`purpose` text NOT NULL,
	`code` longtext NOT NULL,
	`executionStatus` enum('draft','exported','not_executed') NOT NULL DEFAULT 'not_executed',
	`inputSnapshotJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyst_notebooks_id` PRIMARY KEY(`id`),
	CONSTRAINT `analyst_notebooks_unique` UNIQUE(`analystPlanId`,`versionNumber`,`language`)
);
--> statement-breakpoint
CREATE INDEX `analyst_notebooks_plan_idx` ON `analyst_notebooks` (`analystPlanId`);