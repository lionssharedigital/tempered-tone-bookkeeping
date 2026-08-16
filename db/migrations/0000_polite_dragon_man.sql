CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`institution` text NOT NULL,
	`account_type` text DEFAULT 'bank' NOT NULL,
	`opening_balance_cents` integer DEFAULT 0 NOT NULL,
	`opening_balance_date` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_name_unique` ON `accounts` (`name`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_categories_name_type` ON `categories` (`name`,`type`);--> statement-breakpoint
CREATE TABLE `category_map_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword` text NOT NULL,
	`category_id` integer NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_category_map_keyword` ON `category_map_rules` (`keyword`);--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`source_type` text NOT NULL,
	`original_filename` text NOT NULL,
	`file_hash` text NOT NULL,
	`column_mapping_json` text,
	`row_count` integer DEFAULT 0 NOT NULL,
	`imported_count` integer DEFAULT 0 NOT NULL,
	`skipped_duplicate_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_import_batches_file_hash` ON `import_batches` (`file_hash`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`date` text NOT NULL,
	`payee` text NOT NULL,
	`bank_transaction_type` text,
	`description` text,
	`reference` text,
	`status` text DEFAULT 'posted' NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`category_id` integer,
	`category_source` text DEFAULT 'unmatched' NOT NULL,
	`matched_rule_id` integer,
	`transfer_pair_id` integer,
	`notes` text,
	`import_batch_id` integer,
	`dedup_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matched_rule_id`) REFERENCES `category_map_rules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`import_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_txn_account_date` ON `transactions` (`account_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_txn_category` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_txn_dedup` ON `transactions` (`account_id`,`dedup_hash`);