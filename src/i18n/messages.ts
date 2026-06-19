import type { Locale } from "./locale";

/**
 * UI messages are split into one fragment file per namespace so that parallel
 * work never touches the same file. They are statically imported here and
 * assembled into the per-locale message object next-intl expects.
 */

// ro
import roCommon from "../messages/ro/common.json";
import roNav from "../messages/ro/nav.json";
import roLogin from "../messages/ro/login.json";
import roLabels from "../messages/ro/labels.json";
import roValidation from "../messages/ro/validation.json";
import roActions from "../messages/ro/actions.json";
import roHome from "../messages/ro/home.json";
import roReferatNew from "../messages/ro/referatNew.json";
import roReferatDetail from "../messages/ro/referatDetail.json";
import roInbox from "../messages/ro/inbox.json";
import roAdmin from "../messages/ro/admin.json";
import roUsersAdmin from "../messages/ro/usersAdmin.json";
import roWorkflowAdmin from "../messages/ro/workflowAdmin.json";
import roDelegationForm from "../messages/ro/delegationForm.json";
import roDelegations from "../messages/ro/delegations.json";
import roSearch from "../messages/ro/search.json";
import roReports from "../messages/ro/reports.json";
import roProcurement from "../messages/ro/procurement.json";
import roNotifications from "../messages/ro/notifications.json";
import roPdf from "../messages/ro/pdf.json";
import roEmail from "../messages/ro/email.json";

// hu
import huCommon from "../messages/hu/common.json";
import huNav from "../messages/hu/nav.json";
import huLogin from "../messages/hu/login.json";
import huLabels from "../messages/hu/labels.json";
import huValidation from "../messages/hu/validation.json";
import huActions from "../messages/hu/actions.json";
import huHome from "../messages/hu/home.json";
import huReferatNew from "../messages/hu/referatNew.json";
import huReferatDetail from "../messages/hu/referatDetail.json";
import huInbox from "../messages/hu/inbox.json";
import huAdmin from "../messages/hu/admin.json";
import huUsersAdmin from "../messages/hu/usersAdmin.json";
import huWorkflowAdmin from "../messages/hu/workflowAdmin.json";
import huDelegationForm from "../messages/hu/delegationForm.json";
import huDelegations from "../messages/hu/delegations.json";
import huSearch from "../messages/hu/search.json";
import huReports from "../messages/hu/reports.json";
import huProcurement from "../messages/hu/procurement.json";
import huNotifications from "../messages/hu/notifications.json";
import huPdf from "../messages/hu/pdf.json";
import huEmail from "../messages/hu/email.json";

export const NAMESPACES = [
  "common", "nav", "login", "labels", "validation", "actions", "home",
  "referatNew", "referatDetail", "inbox", "admin", "usersAdmin", "workflowAdmin",
  "delegationForm", "delegations", "search", "reports", "procurement",
  "notifications", "pdf", "email",
] as const;

const MESSAGES = {
  ro: {
    common: roCommon, nav: roNav, login: roLogin, labels: roLabels,
    validation: roValidation, actions: roActions, home: roHome,
    referatNew: roReferatNew, referatDetail: roReferatDetail, inbox: roInbox,
    admin: roAdmin, usersAdmin: roUsersAdmin, workflowAdmin: roWorkflowAdmin,
    delegationForm: roDelegationForm, delegations: roDelegations, search: roSearch,
    reports: roReports, procurement: roProcurement, notifications: roNotifications,
    pdf: roPdf, email: roEmail,
  },
  hu: {
    common: huCommon, nav: huNav, login: huLogin, labels: huLabels,
    validation: huValidation, actions: huActions, home: huHome,
    referatNew: huReferatNew, referatDetail: huReferatDetail, inbox: huInbox,
    admin: huAdmin, usersAdmin: huUsersAdmin, workflowAdmin: huWorkflowAdmin,
    delegationForm: huDelegationForm, delegations: huDelegations, search: huSearch,
    reports: huReports, procurement: huProcurement, notifications: huNotifications,
    pdf: huPdf, email: huEmail,
  },
} as const;

export function loadMessages(locale: Locale) {
  return MESSAGES[locale];
}
