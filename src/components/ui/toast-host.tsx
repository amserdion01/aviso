"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Toast, type ToastTone } from "./primitives";

interface Flash {
  tone: ToastTone;
  title: string;
  message?: string;
}

/** Maps a `?flash=` value (set by a server action before redirect) to a toast. */
const FLASH: Record<string, Flash> = {
  create: { tone: "success", title: "Referat trimis", message: "Referatul a intrat pe traseul de avizare." },
  approve: { tone: "success", title: "Referat aprobat", message: "A fost trimis mai departe pe traseu." },
  send_back: { tone: "info", title: "Trimis înapoi", message: "Referatul a fost returnat pasului anterior." },
  reject: { tone: "info", title: "Referat respins", message: "Solicitantul a fost notificat." },
};

/**
 * Surfaces a one-shot flash toast carried in the `?flash=` query param after a
 * server-action redirect. Visibility is derived from the URL; closing or the
 * auto-dismiss timer strips the param (so a refresh won't re-show it).
 */
export function ToastHost() {
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
      <Toast tone={def.tone} title={def.title} message={def.message} onClose={dismiss} />
    </div>
  );
}
