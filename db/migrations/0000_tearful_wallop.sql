CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(120) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_role_check" CHECK ("workspace_members"."role" IN ('owner', 'admin', 'member', 'viewer'))
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"workspace_id" uuid NOT NULL,
	"url" text NOT NULL,
	"domain" varchar(255),
	"tracking_code" varchar(64) NOT NULL,
	"public_mode" boolean DEFAULT false NOT NULL,
	"timezone" varchar(100),
	"excluded_ips" text[] DEFAULT '{}' NOT NULL,
	"excluded_paths" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_tracking_code_unique" UNIQUE("tracking_code")
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"metric" varchar(32) NOT NULL,
	"threshold_type" varchar(32) NOT NULL,
	"threshold_value" double precision NOT NULL,
	"webhook_url" text NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alerts_metric_check" CHECK ("alerts"."metric" IN ('pageViews', 'uniqueUsers', 'sessions')),
	CONSTRAINT "alerts_threshold_type_check" CHECK ("alerts"."threshold_type" IN ('drop_pct', 'value_below'))
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar(16) NOT NULL,
	"match_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_type_check" CHECK ("goals"."type" IN ('page', 'event'))
);
--> statement-breakpoint
CREATE TABLE "funnels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"steps" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pageviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"url" varchar(2048) NOT NULL,
	"path" varchar(1024) NOT NULL,
	"referrer" varchar(2048),
	"source" varchar(255) DEFAULT 'Direct' NOT NULL,
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
	"session_id" varchar(100) NOT NULL,
	"user_id" varchar(100),
	"user_agent" varchar(512),
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"utm_term" varchar(255),
	"utm_content" varchar(255),
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"url" varchar(2048) NOT NULL,
	"path" varchar(1024) NOT NULL,
	"data" jsonb,
	"session_id" varchar(100) NOT NULL,
	"user_id" varchar(100),
	"country" varchar(64),
	"region" varchar(128),
	"city" varchar(128),
	"browser" varchar(64),
	"browser_version" varchar(32),
	"os" varchar(64),
	"os_version" varchar(32),
	"device" varchar(32),
	"device_vendor" varchar(64),
	"device_model" varchar(128),
	"referrer" varchar(2048),
	"source" varchar(255) DEFAULT 'Direct' NOT NULL,
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"utm_term" varchar(255),
	"utm_content" varchar(255),
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_rollups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"page_views" integer DEFAULT 0 NOT NULL,
	"sessions" integer DEFAULT 0 NOT NULL,
	"bounces" integer DEFAULT 0 NOT NULL,
	"session_duration_sec" integer DEFAULT 0 NOT NULL,
	"duration_session_count" integer DEFAULT 0 NOT NULL,
	"user_ids" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pageviews" ADD CONSTRAINT "pageviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_rollups" ADD CONSTRAINT "daily_rollups_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "projects_workspace_id_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "alerts_project_id_created_at_idx" ON "alerts" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "goals_project_id_created_at_idx" ON "goals" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "funnels_project_id_created_at_idx" ON "funnels" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "pageviews_project_id_timestamp_idx" ON "pageviews" USING btree ("project_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "pageviews_project_id_session_id_idx" ON "pageviews" USING btree ("project_id","session_id");--> statement-breakpoint
CREATE INDEX "pageviews_project_id_path_idx" ON "pageviews" USING btree ("project_id","path");--> statement-breakpoint
CREATE INDEX "pageviews_project_id_source_idx" ON "pageviews" USING btree ("project_id","source");--> statement-breakpoint
CREATE INDEX "pageviews_project_id_country_idx" ON "pageviews" USING btree ("project_id","country");--> statement-breakpoint
CREATE INDEX "pageviews_project_id_browser_idx" ON "pageviews" USING btree ("project_id","browser");--> statement-breakpoint
CREATE INDEX "pageviews_project_id_device_idx" ON "pageviews" USING btree ("project_id","device");--> statement-breakpoint
CREATE INDEX "pageviews_project_id_timestamp_session_id_idx" ON "pageviews" USING btree ("project_id","timestamp" DESC NULLS LAST,"session_id");--> statement-breakpoint
CREATE INDEX "pageviews_project_id_utm_source_idx" ON "pageviews" USING btree ("project_id","utm_source");--> statement-breakpoint
CREATE INDEX "pageviews_project_id_utm_campaign_idx" ON "pageviews" USING btree ("project_id","utm_campaign");--> statement-breakpoint
CREATE INDEX "events_project_id_timestamp_idx" ON "events" USING btree ("project_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "events_project_id_name_idx" ON "events" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "events_project_id_session_id_idx" ON "events" USING btree ("project_id","session_id");--> statement-breakpoint
CREATE INDEX "events_project_id_source_idx" ON "events" USING btree ("project_id","source");--> statement-breakpoint
CREATE INDEX "events_project_id_utm_campaign_idx" ON "events" USING btree ("project_id","utm_campaign");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_rollups_project_id_date_idx" ON "daily_rollups" USING btree ("project_id","date");