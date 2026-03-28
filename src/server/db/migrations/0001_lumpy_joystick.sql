CREATE INDEX "audit_log_project_created_idx" ON "audit_log" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "evidence_project_id_idx" ON "evidence" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "evidence_project_created_idx" ON "evidence" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "evidence_captured_at_idx" ON "evidence" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX "evidence_links_task_id_idx" ON "evidence_links" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "projects_org_id_idx" ON "projects" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_project_id_idx" ON "reports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_project_id_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");