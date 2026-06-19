ALTER TABLE "users" ADD COLUMN "locale" text DEFAULT 'ro' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_locale_chk" CHECK ("users"."locale" in ('ro','hu'));