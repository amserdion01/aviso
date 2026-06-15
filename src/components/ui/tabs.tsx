"use client";
import { useState, type ReactNode } from "react";

export interface TabItem {
  value: string;
  label: ReactNode;
  trailing?: ReactNode;
}

/** Underline tabs that switch between pre-rendered panels (passed by value). */
export function Tabs({ items, panels, initial }: { items: TabItem[]; panels: Record<string, ReactNode>; initial?: string }) {
  const [active, setActive] = useState(initial ?? items[0]?.value);
  return (
    <>
      <div className="avi-tabs" role="tablist">
        {items.map((it) => (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={it.value === active}
            className={"avi-tab" + (it.value === active ? " is-active" : "")}
            onClick={() => setActive(it.value)}
          >
            {it.label}
            {it.trailing}
          </button>
        ))}
      </div>
      <div style={{ height: 18 }} />
      {panels[active]}
    </>
  );
}
