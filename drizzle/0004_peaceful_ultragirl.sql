CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "last_activity_at" timestamp with time zone;--> statement-breakpoint
INSERT INTO "activities" ("project_id", "source", "created_at")
SELECT "project_id", 'lifecycle_state', "created_at" FROM "lifecycle_state_changes";--> statement-breakpoint
UPDATE "projects"
SET "last_activity_at" = COALESCE(
	(SELECT MAX("created_at") FROM "lifecycle_state_changes" WHERE "project_id" = "projects"."id"),
	"projects"."created_at"
);--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "last_activity_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "last_activity_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_project_created_at_idx" ON "activities" USING btree ("project_id","created_at");