"use client";
import { useEffect, type ReactNode } from "react";

export function Dialog({
  open,
  title,
  subtitle,
  size = "md",
  onClose,
  footer,
  children,
}: {
  open: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
  size?: "sm" | "md" | "lg";
  onClose: () => void;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="avi-dialog__overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`avi-dialog avi-dialog--${size}`} role="dialog" aria-modal="true">
        <div className="avi-dialog__head">
          <div className="avi-dialog__titles">
            {title && <div className="avi-dialog__title">{title}</div>}
            {subtitle && <div className="avi-dialog__sub">{subtitle}</div>}
          </div>
          <button className="avi-dialog__close" aria-label="Închide" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="avi-dialog__body">{children}</div>
        {footer && <div className="avi-dialog__foot">{footer}</div>}
      </div>
    </div>
  );
}
