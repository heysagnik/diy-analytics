ALTER TABLE "alerts" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "funnel_id" uuid;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_goal_id_idx" ON "alerts" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "alerts_funnel_id_idx" ON "alerts" USING btree ("funnel_id");--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_single_target_check" CHECK (NOT ("alerts"."goal_id" IS NOT NULL AND "alerts"."funnel_id" IS NOT NULL));