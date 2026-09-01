CREATE TYPE "public"."lifecycle_state" AS ENUM('exploring', 'building', 'released', 'maintenance', 'shelved');--> statement-breakpoint
CREATE TABLE "lifecycle_state_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"lifecycle_state" "lifecycle_state" NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"repository_url" text NOT NULL,
	"deployed_url" text,
	"stack" text NOT NULL,
	"lifecycle_state" "lifecycle_state" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lifecycle_state_changes" ADD CONSTRAINT "lifecycle_state_changes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lifecycle_state_changes_project_created_at_idx" ON "lifecycle_state_changes" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "projects_lifecycle_state_created_at_idx" ON "projects" USING btree ("lifecycle_state","created_at");