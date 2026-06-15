CREATE TABLE "requisition_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"requisition_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "requisition_comments" ADD CONSTRAINT "requisition_comments_requisition_id_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_comments" ADD CONSTRAINT "requisition_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "requisition_comments_req_idx" ON "requisition_comments" USING btree ("requisition_id","created_at");