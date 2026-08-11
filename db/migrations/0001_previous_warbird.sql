CREATE TABLE "annotations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"text" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "api_key" varchar(64);--> statement-breakpoint
UPDATE "projects" SET "api_key" = 'dak_' || replace(gen_random_uuid()::text, '-', '') WHERE "api_key" IS NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "api_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "channel" varchar(16) DEFAULT 'generic' NOT NULL;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "annotations_project_id_timestamp_idx" ON "annotations" USING btree ("project_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_api_key_unique" UNIQUE("api_key");--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_channel_check" CHECK ("alerts"."channel" IN ('generic', 'slack', 'discord', 'pagerduty'));