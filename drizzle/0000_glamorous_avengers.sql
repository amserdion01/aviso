CREATE TABLE "approval_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"step_order" integer NOT NULL,
	"task_type" text NOT NULL,
	"required_capability" text NOT NULL,
	"approver_strategy" text NOT NULL,
	"approver_param" text,
	"applies_when" jsonb,
	"label" text NOT NULL,
	CONSTRAINT "approval_steps_strategy_chk" CHECK ("approval_steps"."approver_strategy" in ('org_relative','capability','director_by_unit'))
);
--> statement-breakpoint
CREATE TABLE "approval_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"requisition_id" text NOT NULL,
	"step_order" integer NOT NULL,
	"task_type" text NOT NULL,
	"required_capability" text NOT NULL,
	"effective_approver_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"acted_by" text,
	"acted_at" timestamp with time zone,
	CONSTRAINT "approval_tasks_status_chk" CHECK ("approval_tasks"."status" in ('pending','waiting','approved','rejected','sent_back','skipped'))
);
--> statement-breakpoint
CREATE TABLE "delegations" (
	"id" text PRIMARY KEY NOT NULL,
	"delegator_id" text NOT NULL,
	"delegate_id" text NOT NULL,
	"capability" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "delegations_window_chk" CHECK ("delegations"."ends_at" > "delegations"."starts_at"),
	CONSTRAINT "delegations_not_self_chk" CHECK ("delegations"."delegator_id" <> "delegations"."delegate_id")
);
--> statement-breakpoint
CREATE TABLE "org_units" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"parent_id" text,
	"director_type" text,
	CONSTRAINT "org_units_kind_chk" CHECK ("org_units"."kind" in ('serviciu','birou'))
);
--> statement-breakpoint
CREATE TABLE "requisition_transitions" (
	"id" text PRIMARY KEY NOT NULL,
	"requisition_id" text NOT NULL,
	"seq" integer NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"comment" text,
	"is_most_recent" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requisition_transitions_action_chk" CHECK ("requisition_transitions"."action" in ('create','approve','reject','send_back'))
);
--> statement-breakpoint
CREATE TABLE "requisitions" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_id" text NOT NULL,
	"org_unit_id" text NOT NULL,
	"item" text NOT NULL,
	"quantity" integer NOT NULL,
	"justification" text NOT NULL,
	"cost_center" text NOT NULL,
	"estimated_value_minor" integer,
	"needs_it" boolean DEFAULT false NOT NULL,
	"needs_ssm" boolean DEFAULT false NOT NULL,
	"procurement_type" text,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requisitions_status_chk" CHECK ("requisitions"."status" in ('in_progress','approved','rejected')),
	CONSTRAINT "requisitions_quantity_chk" CHECK ("requisitions"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "user_capabilities" (
	"user_id" text NOT NULL,
	"capability" text NOT NULL,
	CONSTRAINT "user_capabilities_user_id_capability_pk" PRIMARY KEY("user_id","capability")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"username" text,
	"org_unit_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_requisition_id_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_effective_approver_id_users_id_fk" FOREIGN KEY ("effective_approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_acted_by_users_id_fk" FOREIGN KEY ("acted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegator_id_users_id_fk" FOREIGN KEY ("delegator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegate_id_users_id_fk" FOREIGN KEY ("delegate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_transitions" ADD CONSTRAINT "requisition_transitions_requisition_id_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_transitions" ADD CONSTRAINT "requisition_transitions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_org_unit_id_org_units_id_fk" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_capabilities" ADD CONSTRAINT "user_capabilities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_unit_id_org_units_id_fk" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approval_steps_order_uniq" ON "approval_steps" USING btree ("step_order");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_tasks_req_step_uniq" ON "approval_tasks" USING btree ("requisition_id","step_order");--> statement-breakpoint
CREATE INDEX "approval_tasks_inbox_idx" ON "approval_tasks" USING btree ("effective_approver_id","status");--> statement-breakpoint
CREATE INDEX "delegations_delegate_idx" ON "delegations" USING btree ("delegate_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "req_transitions_seq_uniq" ON "requisition_transitions" USING btree ("requisition_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "req_transitions_most_recent_uniq" ON "requisition_transitions" USING btree ("requisition_id") WHERE "requisition_transitions"."is_most_recent";--> statement-breakpoint
CREATE INDEX "requisitions_requester_idx" ON "requisitions" USING btree ("requester_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uniq" ON "users" USING btree ("email");