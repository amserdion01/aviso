/**
 * Aviso design-system primitives — presentational, no hooks, no server-only
 * imports, so they render in both server and client components. Styling lives
 * in src/app/design/components.css (class names mirror the design bundle).
 */
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import { Icon, type IconName } from "./icon";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/* ---------------- PageHead ---------------- */
export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="avi-pagehead">
      <div>
        <h1 className="avi-pagehead__title">{title}</h1>
        {sub && <p className="avi-pagehead__sub">{sub}</p>}
      </div>
      {children && <div className="avi-pagehead__actions">{children}</div>}
    </div>
  );
}

/* ---------------- Button ---------------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  fullWidth = false,
  className,
  children,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <button
      type={type}
      className={cx("avi-btn", `avi-btn--${variant}`, `avi-btn--${size}`, fullWidth && "avi-btn--full", className)}
      {...rest}
    >
      {iconLeft && <span className="avi-btn__ico">{iconLeft}</span>}
      {children && <span>{children}</span>}
      {iconRight && <span className="avi-btn__ico">{iconRight}</span>}
    </button>
  );
}

/** Anchor styled as a Button — for navigation (compose with next/link via `as`). */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  iconLeft,
  fullWidth = false,
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: ButtonVariant;
  size?: Size;
  iconLeft?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
  target?: string;
  rel?: string;
}) {
  return (
    <Link
      href={href}
      className={cx("avi-btn", `avi-btn--${variant}`, `avi-btn--${size}`, fullWidth && "avi-btn--full", className)}
      {...rest}
    >
      {iconLeft && <span className="avi-btn__ico">{iconLeft}</span>}
      {children && <span>{children}</span>}
    </Link>
  );
}

/* ---------------- IconButton ---------------- */
export function IconButton({
  variant = "ghost",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "ghost" | "outline" | "solid"; size?: "sm" | "md" }) {
  return (
    <button type={type} className={cx("avi-iconbtn", `avi-iconbtn--${variant}`, `avi-iconbtn--${size}`, className)} {...rest}>
      {children}
    </button>
  );
}

/* ---------------- Badge / CountBadge ---------------- */
export function Badge({
  variant = "default",
  icon,
  className,
  children,
}: {
  variant?: "default" | "accent" | "outline";
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return <span className={cx("avi-tag", variant !== "default" && `avi-tag--${variant}`, className)}>{icon}{children}</span>;
}

export function CountBadge({ count, max = 99, tone = "accent" }: { count: number; max?: number; tone?: "accent" | "neutral" | "danger" }) {
  const display = count > max ? `${max}+` : count;
  return <span className={cx("avi-count", tone !== "accent" && `avi-count--${tone}`)}>{display}</span>;
}

/* ---------------- StatusBadge ---------------- */
export type StatusTone = "pending" | "approved" | "rejected" | "sentback" | "finalized" | "neutral";
const STATUS_LABEL: Record<StatusTone, string> = {
  pending: "În așteptare",
  approved: "Aprobat",
  rejected: "Respins",
  sentback: "Trimis înapoi",
  finalized: "Finalizat",
  neutral: "Schiță",
};
const STATUS_GLYPH: Partial<Record<StatusTone, string>> = {
  approved: '<path d="M20 6 9 17l-5-5"/>',
  finalized: '<path d="M20 6 9 17l-5-5"/>',
  rejected: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  sentback: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/>',
  pending: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  neutral: '<circle cx="12" cy="12" r="9"/>',
};

export function StatusBadge({
  status,
  label,
  size = "md",
  icon = "dot",
}: {
  status: StatusTone;
  label?: string;
  size?: "sm" | "md";
  icon?: "dot" | "icon";
}) {
  return (
    <span className={cx("avi-badge", `avi-badge--${status}`, size === "sm" && "avi-badge--sm")}>
      {icon === "icon" && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: STATUS_GLYPH[status] ?? "" }} />
      )}
      {icon === "dot" && <span className="avi-badge__dot" />}
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

/* ---------------- Card ---------------- */
export function Card({
  title,
  subtitle,
  action,
  footer,
  padding = "md",
  className,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  padding?: "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
}) {
  const hasHeader = title || action;
  return (
    <div className={cx("avi-card", !hasHeader && !footer && `avi-card--pad-${padding}`, className)}>
      {hasHeader && (
        <div className="avi-card__head">
          <div className="avi-card__titles">
            {title && <div className="avi-card__title">{title}</div>}
            {subtitle && <div className="avi-card__sub">{subtitle}</div>}
          </div>
          {action && <div className="avi-card__action">{action}</div>}
        </div>
      )}
      {hasHeader || footer ? <div className={`avi-card--pad-${padding}`}>{children}</div> : children}
      {footer && <div className="avi-card__foot">{footer}</div>}
    </div>
  );
}

/* ---------------- Avatar ---------------- */
const TINTS = ["#246CA6", "#0E807A", "#6249BC", "#9A6A12", "#1E8A4D", "#4F5A65"];
function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function tintFor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}
export function Avatar({ name = "", size = "md" }: { name?: string; size?: "xs" | "sm" | "md" | "lg" }) {
  return (
    <span className={cx("avi-avatar", `avi-avatar--${size}`)} style={{ background: tintFor(name) }} title={name || undefined}>
      {initials(name)}
    </span>
  );
}

/* ---------------- FormField ---------------- */
export function FormField({
  label,
  htmlFor,
  required = false,
  optional = false,
  optionalLabel = "(opțional)",
  hint,
  error,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  optionalLabel?: string;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx("avi-formfield", className)}>
      {label && (
        <label className="avi-formfield__label" htmlFor={htmlFor}>
          {label}
          {required && <span className="avi-formfield__req" aria-hidden="true">*</span>}
          {optional && !required && <span className="avi-formfield__optional">{optionalLabel}</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="avi-formfield__error">
          <Icon name="alert-circle" />
          {error}
        </span>
      ) : (
        hint && <span className="avi-formfield__hint">{hint}</span>
      )}
    </div>
  );
}

/* ---------------- Input / Textarea / Select ---------------- */
export function Input({
  size = "md",
  invalid = false,
  prefix,
  suffix,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix" | "suffix"> & { size?: Size; invalid?: boolean; prefix?: ReactNode; suffix?: ReactNode }) {
  return (
    <div className={cx("avi-field", `avi-field--${size}`, invalid && "is-invalid", rest.disabled && "is-disabled", className)}>
      {prefix && <span className="avi-field__affix avi-field__affix--left">{prefix}</span>}
      <input className="avi-input" aria-invalid={invalid || undefined} {...rest} />
      {suffix && <span className="avi-field__affix avi-field__affix--right">{suffix}</span>}
    </div>
  );
}

export function Textarea({
  invalid = false,
  rows = 4,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cx("avi-textarea", invalid && "is-invalid", className)} rows={rows} aria-invalid={invalid || undefined} {...rest} />;
}

type Opt = string | { value: string; label: string };
export function Select({
  size = "md",
  invalid = false,
  placeholder,
  options,
  className,
  children,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & { size?: "sm" | "md"; invalid?: boolean; placeholder?: string; options?: Opt[] }) {
  return (
    <div className={cx("avi-select", `avi-select--${size}`, invalid && "is-invalid", rest.disabled && "is-disabled", className)}>
      <select className="avi-select__el" aria-invalid={invalid || undefined} {...rest}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options
          ? options.map((o) => {
              const opt = typeof o === "string" ? { value: o, label: o } : o;
              return <option key={opt.value} value={opt.value}>{opt.label}</option>;
            })
          : children}
      </select>
      <span className="avi-select__chev" aria-hidden="true">
        <Icon name="chevron-down" size={16} />
      </span>
    </div>
  );
}

/* ---------------- Checkbox / Switch ---------------- */
export function Checkbox({
  label,
  description,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; description?: ReactNode }) {
  return (
    <label className={cx("avi-check", rest.disabled && "is-disabled", className)}>
      <input type="checkbox" className="avi-check__input" {...rest} />
      <span className="avi-check__box" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {(label || description) && (
        <span className="avi-check__label">{label}{description && <small>{description}</small>}</span>
      )}
    </label>
  );
}

export function Switch({
  label,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  return (
    <label className={cx("avi-switch", rest.disabled && "is-disabled", className)}>
      <input type="checkbox" role="switch" className="avi-switch__input" {...rest} />
      <span className="avi-switch__track" aria-hidden="true"><span className="avi-switch__thumb" /></span>
      {label && <span>{label}</span>}
    </label>
  );
}

/* ---------------- Stepper ---------------- */
export type StepStatus = "done" | "current" | "pending" | "rejected" | "sentback";
export interface Step {
  label: ReactNode;
  sublabel?: ReactNode;
  status?: StepStatus;
}
const CHECK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
const XMARK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
const BACK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-1" /></svg>;

export function Stepper({ steps, orientation = "horizontal" }: { steps: Step[]; orientation?: "horizontal" | "vertical" }) {
  return (
    <div className={cx("avi-stepper", `avi-stepper--${orientation}`)}>
      {steps.map((step, i) => {
        const status = step.status ?? "pending";
        const marker = status === "done" ? CHECK : status === "rejected" ? XMARK : status === "sentback" ? BACK : i + 1;
        return (
          <div key={i} className={`avi-step is-${status}`}>
            <span className="avi-step__marker">{marker}</span>
            <span className="avi-step__body">
              <span className="avi-step__label">{step.label}</span>
              {step.sublabel && <span className="avi-step__sub">{step.sublabel}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- AuditTimeline ---------------- */
export type AuditType = "created" | "approved" | "rejected" | "sentback" | "finalized" | "comment";
export interface AuditEvent {
  type?: AuditType;
  actor: ReactNode;
  action: ReactNode;
  role?: ReactNode;
  time?: ReactNode;
  comment?: ReactNode;
}
const GLYPH: Record<AuditType, string> = {
  approved: '<path d="M20 6 9 17l-5-5"/>',
  finalized: '<path d="M20 6 9 17l-5-5"/>',
  rejected: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  sentback: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/>',
  created: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  comment: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
};
export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <div className="avi-audit">
      {events.map((ev, i) => {
        const type = ev.type ?? "comment";
        return (
          <div key={i} className={`avi-audit__item avi-audit__item--${type}`}>
            <div className="avi-audit__rail">
              <span className="avi-audit__dot">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: GLYPH[type] }} />
              </span>
            </div>
            <div className="avi-audit__body">
              <div className="avi-audit__line">
                <span className="avi-audit__actor">{ev.actor}</span>
                <span className="avi-audit__action">{ev.action}</span>
                {ev.time && <span className="avi-audit__time">{ev.time}</span>}
              </div>
              {ev.role && <div className="avi-audit__role">{ev.role}</div>}
              {ev.comment && <div className="avi-audit__comment">{ev.comment}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Toast ---------------- */
export type ToastTone = "success" | "error" | "info" | "warning";
const TOAST_GLYPH: Record<ToastTone, string> = {
  success: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  error: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  warning: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
};
export function Toast({
  tone = "info",
  title,
  message,
  onClose,
}: {
  tone?: ToastTone;
  title?: ReactNode;
  message?: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className={cx("avi-toast", `avi-toast--${tone}`)} role="status">
      <span className="avi-toast__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: TOAST_GLYPH[tone] }} />
      </span>
      <div className="avi-toast__body">
        {title && <div className="avi-toast__title">{title}</div>}
        {message && <div className="avi-toast__msg">{message}</div>}
      </div>
      {onClose && (
        <button className="avi-toast__close" aria-label="Închide" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ---------------- EmptyState ---------------- */
export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon?: IconName;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="avi-empty">
      {icon && <div className="avi-empty__icon"><Icon name={icon} size={26} /></div>}
      {title && <div className="avi-empty__title">{title}</div>}
      {description && <div className="avi-empty__desc">{description}</div>}
      {actions && <div className="avi-empty__actions">{actions}</div>}
    </div>
  );
}

/* ---------------- Table ---------------- */
export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  width?: string | number;
  render?: (row: T) => ReactNode;
}
export function Table<T>({
  columns,
  data,
  rowKey,
}: {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, i: number) => string | number;
}) {
  return (
    <div className="avi-table-wrap">
      <table className="avi-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align ? `avi-td--${c.align}` : undefined} style={c.width ? { width: c.width } : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={rowKey(row, i)}>
              {columns.map((c) => (
                <td key={c.key} className={c.align ? `avi-td--${c.align}` : undefined}>
                  {c.render ? c.render(row) : (row as Record<string, ReactNode>)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- NavItem ---------------- */
export function NavItem({
  icon,
  label,
  active = false,
  trailing,
  href,
}: {
  icon?: ReactNode;
  label: ReactNode;
  active?: boolean;
  trailing?: ReactNode;
  href: string;
}) {
  // Rendered via next/link in AppShell; this is the anchor styling only.
  return (
    <a className={cx("avi-navitem", active && "is-active")} href={href} aria-current={active ? "page" : undefined}>
      {icon && <span className="avi-navitem__icon">{icon}</span>}
      <span className="avi-navitem__label">{label}</span>
      {trailing && <span className="avi-navitem__trailing">{trailing}</span>}
    </a>
  );
}
