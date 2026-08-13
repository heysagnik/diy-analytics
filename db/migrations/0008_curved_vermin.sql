CREATE INDEX "events_project_id_country_idx" ON "events" USING btree ("project_id","country");--> statement-breakpoint
CREATE INDEX "events_project_id_browser_idx" ON "events" USING btree ("project_id","browser");--> statement-breakpoint
CREATE INDEX "events_project_id_os_idx" ON "events" USING btree ("project_id","os");--> statement-breakpoint
CREATE INDEX "events_project_id_device_idx" ON "events" USING btree ("project_id","device");--> statement-breakpoint
CREATE INDEX "events_project_id_path_idx" ON "events" USING btree ("project_id","path");--> statement-breakpoint
CREATE INDEX "events_project_id_utm_source_idx" ON "events" USING btree ("project_id","utm_source");--> statement-breakpoint
CREATE INDEX "events_project_id_utm_medium_idx" ON "events" USING btree ("project_id","utm_medium");--> statement-breakpoint
CREATE INDEX "pageviews_project_id_os_idx" ON "pageviews" USING btree ("project_id","os");--> statement-breakpoint
CREATE INDEX "pageviews_project_id_utm_medium_idx" ON "pageviews" USING btree ("project_id","utm_medium");--> statement-breakpoint
CREATE INDEX "events_web_vital_metric_idx" ON "events" USING btree ("project_id",(("data"->>'metric'))) WHERE "events"."name" = '__web_vital';