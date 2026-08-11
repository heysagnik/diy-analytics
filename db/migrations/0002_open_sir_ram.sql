ALTER TABLE "annotations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "annotations" CASCADE;--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_api_key_unique";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "api_key";