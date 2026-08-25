CREATE TABLE `vault_repository_authorizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repositoryPlanId` int NOT NULL,
	`action` enum('confirmed','revoked') NOT NULL,
	`scope` enum('authenticate_and_prepare_deposit') NOT NULL DEFAULT 'authenticate_and_prepare_deposit',
	`confirmationStatement` text NOT NULL,
	`metadataSnapshotJson` longtext NOT NULL,
	`confirmedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vault_repository_authorizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `vault_repository_authorizations_plan_idx` ON `vault_repository_authorizations` (`repositoryPlanId`);--> statement-breakpoint
CREATE INDEX `vault_repository_authorizations_user_idx` ON `vault_repository_authorizations` (`confirmedByUserId`);--> statement-breakpoint
CREATE INDEX `vault_repository_authorizations_created_idx` ON `vault_repository_authorizations` (`createdAt`);