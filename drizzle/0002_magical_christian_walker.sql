ALTER TABLE "approval_steps" ADD COLUMN "on_send_back" text DEFAULT 'previous' NOT NULL;--> statement-breakpoint
ALTER TABLE "approval_steps" ADD COLUMN "blocking" boolean DEFAULT true NOT NULL;