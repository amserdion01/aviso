ALTER TABLE "approval_steps" DROP CONSTRAINT "approval_steps_strategy_chk";--> statement-breakpoint
ALTER TABLE "requisitions" DROP CONSTRAINT "requisitions_status_chk";--> statement-breakpoint
ALTER TABLE "approval_steps" ADD COLUMN "sets_valuation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "doc_type" text DEFAULT 'referat' NOT NULL;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "in_paap" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "in_seap_catalog" boolean;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "nota_justificativa" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "superior_id" text;--> statement-breakpoint
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_strategy_chk" CHECK ("approval_steps"."approver_strategy" in ('org_relative','capability','director_by_unit','superior'));--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_doctype_chk" CHECK ("requisitions"."doc_type" in ('comanda_interna','referat'));--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_status_chk" CHECK ("requisitions"."status" in ('in_progress','approved','rejected','seap_initiated'));