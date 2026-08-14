CREATE TABLE "error_occurrences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"error_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" varchar(100),
	"user_id" varchar(100),
	"browser" varchar(64),
	"browser_version" varchar(32),
	"os" varchar(64),
	"os_version" varchar(32),
	"device" varchar(32),
	"device_vendor" varchar(64),
	"device_model" varchar(128),
	"country" varchar(64),
	"region" varchar(128),
	"city" varchar(128),
	"url" varchar(2048),
	"source_url" varchar(2048),
	"line" integer,
	"col" integer,
	"breadcrumbs" jsonb,
	"tags" jsonb,
	"extra" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "errors" DROP CONSTRAINT "errors_severity_check";--> statement-breakpoint
ALTER TABLE "errors" ADD COLUMN "error_name" varchar(100);--> statement-breakpoint
ALTER TABLE "error_occurrences" ADD CONSTRAINT "error_occurrences_error_id_errors_id_fk" FOREIGN KEY ("error_id") REFERENCES "public"."errors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_occurrences" ADD CONSTRAINT "error_occurrences_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "error_occurrences_error_id_occurred_at_idx" ON "error_occurrences" USING btree ("error_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "error_occurrences_project_id_occurred_at_idx" ON "error_occurrences" USING btree ("project_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "error_occurrences_error_id_session_id_idx" ON "error_occurrences" USING btree ("error_id","session_id");--> statement-breakpoint
CREATE INDEX "errors_project_id_error_name_idx" ON "errors" USING btree ("project_id","error_name");--> statement-breakpoint
ALTER TABLE "errors" ADD CONSTRAINT "errors_severity_check" CHECK ("errors"."severity" IN ('fatal', 'error', 'warning', 'info', 'debug'));