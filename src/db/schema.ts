import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * State values are kept as text + CHECK constraints (not Postgres ENUMs) so the
 * set can evolve without a type migration. Money/quantity are integers in minor
 * units. The values below mirror src/domain/workflow.ts.
 */

export const TASK_STATUSES = [
  "pending",
  "waiting",
  "approved",
  "rejected",
  "sent_back",
  "skipped",
] as const;

export const REQUISITION_STATUSES = ["in_progress", "approved", "rejected"] as const;

export const TRANSITION_ACTIONS = ["create", "approve", "reject", "send_back"] as const;

export const APPROVER_STRATEGIES = ["org_relative", "capability", "director_by_unit"] as const;

export const ORG_UNIT_KINDS = ["serviciu", "birou"] as const;

// ---------------------------------------------------------------------------
// Identity & org structure
// ---------------------------------------------------------------------------

/**
 * Application users. Better Auth is configured to use this table as its user
 * model; auth-specific tables (sessions, accounts) are generated alongside it.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username"),
  orgUnitId: text("org_unit_id").references(() => orgUnits.id),
  active: boolean("active").notNull().default(true),
  // when the user last opened their notifications feed; unread = events after this
  notificationsSeenAt: timestamp("notifications_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("users_email_uniq").on(t.email)]);

/**
 * Org units are 2 levels: a `serviciu`/secție with `birou`/sector children
 * (parentId). `directorType` names the director who signs for this unit.
 */
export const orgUnits = pgTable("org_units", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  parentId: text("parent_id"),
  directorType: text("director_type"),
}, (t) => [
  check("org_units_kind_chk", sql`${t.kind} in ('serviciu','birou')`),
]);

/**
 * Per-capability authorization: a user holds many capabilities (angajat,
 * sef_birou, it, ru, magazie, director, ...). Authorization is per-capability,
 * not one-role-per-user.
 */
export const userCapabilities = pgTable("user_capabilities", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  capability: text("capability").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.capability] })]);

// ---------------------------------------------------------------------------
// Better Auth tables (session / account / verification)
// Column names follow Better Auth's defaults so the drizzle adapter maps cleanly.
// ---------------------------------------------------------------------------

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("sessions_token_uniq").on(t.token)]);

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Requisitions
// ---------------------------------------------------------------------------

export const requisitions = pgTable("requisitions", {
  id: text("id").primaryKey(),
  requesterId: text("requester_id").notNull().references(() => users.id),
  orgUnitId: text("org_unit_id").notNull().references(() => orgUnits.id),
  item: text("item").notNull(),
  quantity: integer("quantity").notNull(),
  justification: text("justification").notNull(),
  costCenter: text("cost_center").notNull(),
  // estimated value in minor units (bani); never a float
  estimatedValueMinor: integer("estimated_value_minor"),
  // attributes that drive conditional routing (Phase 2)
  needsIt: boolean("needs_it").notNull().default(false),
  needsSsm: boolean("needs_ssm").notNull().default(false),
  procurementType: text("procurement_type"), // achizitii | aprovizionare | servicii (set at incadrare)
  status: text("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("requisitions_status_chk", sql`${t.status} in ('in_progress','approved','rejected')`),
  check("requisitions_quantity_chk", sql`${t.quantity} > 0`),
  index("requisitions_requester_idx").on(t.requesterId),
]);

/**
 * The approval-chain template, seeded with the real Covasna flow. The engine
 * reads these ordered steps, evaluates `appliesWhen` against a requisition, and
 * materializes the applicable ones as approval_tasks.
 */
export const approvalSteps = pgTable("approval_steps", {
  id: text("id").primaryKey(),
  stepOrder: integer("step_order").notNull(),
  taskType: text("task_type").notNull(),
  requiredCapability: text("required_capability").notNull(),
  approverStrategy: text("approver_strategy").notNull(),
  approverParam: text("approver_param"),
  // predicate over requisition attrs; null = always applies
  appliesWhen: jsonb("applies_when"),
  // where a send-back returns to: 'previous' | 'requester' | a step_order
  onSendBack: text("on_send_back").notNull().default("previous"),
  // false = advisory (OPINIE), non-blocking
  blocking: boolean("blocking").notNull().default(true),
  // true for the achiziții-încadrare step whose approval sets procurement_type
  setsProcurementType: boolean("sets_procurement_type").notNull().default(false),
  label: text("label").notNull(),
}, (t) => [
  check(
    "approval_steps_strategy_chk",
    sql`${t.approverStrategy} in ('org_relative','capability','director_by_unit')`,
  ),
  uniqueIndex("approval_steps_order_uniq").on(t.stepOrder),
]);

/**
 * One row per (applicable) step per requisition. The active step is the single
 * row with status 'waiting'. Inbox query:
 *   WHERE effective_approver_id = :me AND status = 'waiting'
 */
export const approvalTasks = pgTable("approval_tasks", {
  id: text("id").primaryKey(),
  requisitionId: text("requisition_id").notNull().references(() => requisitions.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  taskType: text("task_type").notNull(),
  requiredCapability: text("required_capability").notNull(),
  effectiveApproverId: text("effective_approver_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  actedBy: text("acted_by").references(() => users.id),
  actedAt: timestamp("acted_at", { withTimezone: true }),
}, (t) => [
  check(
    "approval_tasks_status_chk",
    sql`${t.status} in ('pending','waiting','approved','rejected','sent_back','skipped')`,
  ),
  uniqueIndex("approval_tasks_req_step_uniq").on(t.requisitionId, t.stepOrder),
  // fast inbox lookup
  index("approval_tasks_inbox_idx").on(t.effectiveApproverId, t.status),
]);

/**
 * APPEND-ONLY audit/history. Never UPDATE/DELETE rows except to clear the
 * is_most_recent flag when appending the next row (done in the same transaction
 * that advances the workflow). Exactly one is_most_recent row per requisition.
 */
export const requisitionTransitions = pgTable("requisition_transitions", {
  id: text("id").primaryKey(),
  requisitionId: text("requisition_id").notNull().references(() => requisitions.id, { onDelete: "cascade" }),
  seq: integer("seq").notNull(),
  actorId: text("actor_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  comment: text("comment"),
  isMostRecent: boolean("is_most_recent").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check(
    "requisition_transitions_action_chk",
    sql`${t.action} in ('create','approve','reject','send_back')`,
  ),
  uniqueIndex("req_transitions_seq_uniq").on(t.requisitionId, t.seq),
  // at most one most-recent row per requisition
  uniqueIndex("req_transitions_most_recent_uniq")
    .on(t.requisitionId)
    .where(sql`${t.isMostRecent}`),
]);

/**
 * Substitute routing. effective_approver_id is resolved at routing time; the
 * date window is enforced in the query and circular chains are rejected.
 */
export const delegations = pgTable("delegations", {
  id: text("id").primaryKey(),
  delegatorId: text("delegator_id").notNull().references(() => users.id),
  delegateId: text("delegate_id").notNull().references(() => users.id),
  capability: text("capability"), // null = all capabilities of the delegator
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  active: boolean("active").notNull().default(true),
}, (t) => [
  check("delegations_window_chk", sql`${t.endsAt} > ${t.startsAt}`),
  check("delegations_not_self_chk", sql`${t.delegatorId} <> ${t.delegateId}`),
  index("delegations_delegate_idx").on(t.delegateId, t.active),
]);

/**
 * Free-form discussion on a requisition (separate from the approval audit in
 * requisition_transitions). Anyone who can view the referat may comment.
 */
export const requisitionComments = pgTable("requisition_comments", {
  id: text("id").primaryKey(),
  requisitionId: text("requisition_id").notNull().references(() => requisitions.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("requisition_comments_req_idx").on(t.requisitionId, t.createdAt),
]);
