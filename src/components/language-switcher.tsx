"use client";
import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/app/locale-actions";
import { LOCALES, type Locale } from "@/i18n/locale";

const NAMES: Record<Locale, string> = { ro: "Română", hu: "Magyar" };

export function LanguageSwitcher() {
  const active = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === active || pending) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <div className="avi-langswitch" role="group" aria-label="Limbă / Nyelv">
      {LOCALES.map((loc) => (
        <button
          key={loc}
          type="button"
          className={"avi-langswitch__opt" + (loc === active ? " is-active" : "")}
          aria-pressed={loc === active}
          disabled={pending}
          onClick={() => choose(loc)}
        >
          {loc.toUpperCase()}
          <span className="avi-langswitch__full">{NAMES[loc]}</span>
        </button>
      ))}
    </div>
  );
}
