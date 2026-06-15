"use client";
import { useState } from "react";
import { signIn, signOut } from "@/lib/auth-client";
import { checkActiveStatusAction } from "@/app/actions";
import { Button, Checkbox, FormField, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

export function LoginForm() {
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
      setError("Email sau parolă incorecte.");
      return;
    }
    // Better Auth doesn't know about our `active` flag — block deactivated accounts here.
    if ((await checkActiveStatusAction()) === "inactive") {
      await signOut();
      setLoading(false);
      setError("Contul tău este dezactivat. Contactează biroul IT.");
      return;
    }
    // Full navigation (not router.push) so the freshly-set session cookie is
    // sent on the request for "/"; a client navigation can race the cookie and
    // bounce back to /login. Keep `loading` true — the page reloads.
    window.location.href = "/";
  }

  return (
    <div className="avi-login">
      <div className="avi-login__panel">
        <div className="avi-login__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/aviso-wordmark.svg" width={148} height={36} alt="Aviso" />
        </div>
        <h1 className="avi-login__title">Autentificare</h1>
        <p className="avi-login__sub">Intră în contul tău pentru a gestiona referatele de necesitate.</p>
        <form className="avi-login__form" onSubmit={onSubmit}>
          <FormField label="Email" htmlFor="li-email">
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
          <FormField label="Parolă" htmlFor="li-pass">
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
            <Checkbox label="Ține-mă minte" defaultChecked />
            <a href="#recuperare" onClick={(e) => e.preventDefault()}>Ai uitat parola?</a>
          </div>
          {error && (
            <p className="avi-login__error">
              <Icon name="alert-circle" /> {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
            {loading ? "Se autentifică…" : "Autentificare"}
          </Button>
        </form>
        <div className="avi-login__foot">
          Probleme la conectare? Contactează <a href="#it" onClick={(e) => e.preventDefault()}>biroul IT</a>.
        </div>
      </div>
      <div className="avi-login__aside">
        <div className="avi-login__aside-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/aviso-mark.svg" width={40} height={40} alt="" />
          <div className="avi-login__quote">Referate de necesitate, digitalizate.</div>
          <p className="avi-login__lead">
            Trimite, urmărește și aprobă cereri de achiziție într-un flux clar, cu traseu de avizare și istoric complet.
          </p>
          <ul className="avi-login__list">
            <li><Icon name="route" /> Traseu de avizare pe roluri</li>
            <li><Icon name="users" /> Înlocuitori pentru aprobatori absenți</li>
            <li><Icon name="history" /> Istoric și audit complet</li>
          </ul>
        </div>
        <div className="avi-login__copy">Apa Covasna · Sistem intern Aviso</div>
      </div>
    </div>
  );
}
