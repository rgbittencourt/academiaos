CREATE TABLE `lapis_preregistration_devil_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lapisProjectId` int NOT NULL,
	`preregistrationHash` varchar(128) NOT NULL,
	`reviewJson` longtext NOT NULL,
	`model` varchar(180) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lapis_preregistration_devil_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `lapis_prereg_devil_reviews_project_idx` ON `lapis_preregistration_devil_reviews` (`lapisProjectId`);--> statement-breakpoint
CREATE INDEX `lapis_prereg_devil_reviews_hash_idx` ON `lapis_preregistration_devil_reviews` (`preregistrationHash`);