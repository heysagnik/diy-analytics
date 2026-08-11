CREATE TABLE "errors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"fingerprint" varchar(40) NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"source_url" text,
	"line" integer,
	"col" integer,
	"path" varchar(1024),
	"severity" varchar(16) DEFAULT 'error' NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"release" varchar(100),
	"count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"regressed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "errors_severity_check" CHECK ("errors"."severity" IN ('error', 'warning')),
	CONSTRAINT "errors_status_check" CHECK ("errors"."status" IN ('active', 'resolved'))
);
--> statement-breakpoint
ALTER TABLE "errors" ADD CONSTRAINT "errors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "errors_project_id_fingerprint_idx" ON "errors" USING btree ("project_id","fingerprint");--> statement-breakpoint
CREATE INDEX "errors_project_id_last_seen_at_idx" ON "errors" USING btree ("project_id","last_seen_at" DESC NULLS LAST);