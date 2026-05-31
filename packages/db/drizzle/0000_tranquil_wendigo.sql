CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`seq` integer NOT NULL,
	`type` text NOT NULL,
	`source` text NOT NULL,
	`timestamp` text NOT NULL,
	`payload_json` text NOT NULL,
	`payload_hash` text NOT NULL,
	`previous_hash` text,
	`created_at` text NOT NULL
);
