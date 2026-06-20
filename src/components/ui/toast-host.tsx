"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Toast, type ToastTone } from "./primitives";

/** Maps a `?flash=` value (set by a server action before redirect) to tone + message key. */
const FLASH: Record<string, { tone: ToastTone; key: string }> = {
  create: { tone: "success", key: "create" },
  approve: { tone: "success", key: "approve" },
  send_back: { tone: "info", key: "sendBack" },
  reject: { tone: "info", key: "reject" },
};

/**
 * Surfaces a one-shot flash toast carried in the `?flash=` query param after a
 * server-action redirect. Visibility is derived from the URL; closing or the
 * auto-dismiss timer strips the param (so a refresh won't re-show it).
 */
export function ToastHost() {
  const t = useTranslations();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const flash = params.get("flash");
  const def = flash ? FLASH[flash] : null;

  function dismiss() {
    const next = new URLSearchParams(params);
    next.delete("flash");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (!def) return;
    const timer = setTimeout(dismiss, 4500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash]);

  if (!def) return null;
  return (
    <div className="avi-toast-stack">
      <Toast
        tone={def.tone}
        title={t(`common.toast.${def.key}.title`)}
        message={t(`common.toast.${def.key}.message`)}
        onClose={dismiss}
      />
    </div>
  );
}
