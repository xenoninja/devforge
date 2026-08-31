ALTER TABLE "projects" ADD COLUMN "origin_idea_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_origin_idea_id_ideas_id_fk" FOREIGN KEY ("origin_idea_id") REFERENCES "public"."ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_origin_idea_id_idx" ON "projects" USING btree ("origin_idea_id");