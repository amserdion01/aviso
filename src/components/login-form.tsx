"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn, signOut } from "@/lib/auth-client";
import { checkActiveStatusAction } from "@/app/actions";
import { syncLocaleCookieFromUser } from "@/app/locale-actions";
import { Button, Checkbox, FormField, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { LanguageSwitcher } from "@/components/language-switcher";

export function LoginForm() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    if (error) {
      setLoading(false);
      setError(t("login.errors.invalidCredentials"));
      return;
    }
    // Better Auth doesn't know about our `active` flag — block deactivated accounts here.
    if ((await checkActiveStatusAction()) === "inactive") {
      await signOut();
      setLoading(false);
      setError(t("login.errors.inactive"));
      return;
    }
    // Seed the locale cookie from the user's saved preference before navigating.
    await syncLocaleCookieFromUser();
    // Full navigation (not router.push) so the freshly-set session cookie is
    // sent on the request for "/"; a client navigation can race the cookie and
    // bounce back to /login. Keep `loading` true — the page reloads.
    window.location.href = "/";
  }

  return (
    <div className="avi-login">
      <div className="avi-login__panel">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-4)" }}>
          <LanguageSwitcher />
        </div>
        <div className="avi-login__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/aviso-wordmark.svg" width={190} height={36} alt="HydroKov" />
        </div>
        <h1 className="avi-login__title">{t("login.title")}</h1>
        <p className="avi-login__sub">{t("login.sub")}</p>
        <form className="avi-login__form" onSubmit={onSubmit}>
          <FormField label={t("login.email")} htmlFor="li-email">
            <Input
              id="li-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              prefix={<Icon name="mail" />}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nume@apacovasna.ro"
            />
          </FormField>
          <FormField label={t("login.password")} htmlFor="li-pass">
            <Input
              id="li-pass"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              prefix={<Icon name="lock" />}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
            />
          </FormField>
          <div className="avi-login__row">
            <Checkbox label={t("login.remember")} defaultChecked />
            <a href="#recuperare" onClick={(e) => e.preventDefault()}>{t("login.forgot")}</a>
          </div>
          {error && (
            <p className="avi-login__error">
              <Icon name="alert-circle" /> {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
            {loading ? t("login.loading") : t("login.submit")}
          </Button>
        </form>
        <div className="avi-login__foot">
          {t.rich("login.troubleshoot", {
            it: (chunks) => (
              <a href="#it" onClick={(e) => e.preventDefault()}>
                {chunks}
              </a>
            ),
          })}
        </div>
      </div>
      <div className="avi-login__aside">
        <div className="avi-login__aside-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/aviso-mark.svg" width={40} height={40} alt="" />
          <div className="avi-login__quote">{t("login.aside.quote")}</div>
          <p className="avi-login__lead">{t("login.aside.lead")}</p>
          <ul className="avi-login__list">
            <li><Icon name="route" /> {t("login.aside.features.route")}</li>
            <li><Icon name="users" /> {t("login.aside.features.substitutes")}</li>
            <li><Icon name="history" /> {t("login.aside.features.audit")}</li>
          </ul>
        </div>
        <div className="avi-login__copy">{t("login.footer")}</div>
      </div>
    </div>
  );
}
