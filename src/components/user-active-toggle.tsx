"use client";
import { useState, useTransition } from "react";
import { setUserActiveAction } from "@/app/actions";
import { Switch } from "@/components/ui/primitives";

/** Admin toggle for a user's active state; persists via a server action. */
export function UserActiveToggle({ userId, active }: { userId: string; active: boolean }) {
  const [checked, setChecked] = useState(active);
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={checked}
      disabled={pending}
      aria-label={checked ? "Dezactivează utilizatorul" : "Activează utilizatorul"}
      onChange={(e) => {
        const next = e.target.checked;
        setChecked(next);
        startTransition(async () => {
          try {
            await setUserActiveAction(userId, next);
          } catch {
            setChecked(!next); // revert on failure
          }
        });
      }}
    />
  );
}
