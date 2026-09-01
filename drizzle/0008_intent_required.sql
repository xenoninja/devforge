UPDATE "projects" SET "objective" = 'Define the Objective' WHERE "objective" IS NULL OR btrim("objective") = '';--> statement-breakpoint
UPDATE "projects" SET "next_action" = 'Set the Next Action' WHERE "next_action" IS NULL OR btrim("next_action") = '';--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "objective" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "next_action" SET NOT NULL;
