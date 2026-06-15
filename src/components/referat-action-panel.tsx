"use client";
import { useState } from "react";
import { actReferatAction } from "@/app/actions";
import { Button, FormField, Textarea, Select } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

type Mode = "approve" | "reject" | "send_back";

const BANNER: Record<Mode, { icon: "circle-check" | "corner-up-left" | "alert-circle"; tone: string; text: string }> = {
  approve: { icon: "circle-check", tone: "approve", text: "Aprobi acest referat și îl trimiți mai departe pe traseu." },
  send_back: { icon: "corner-up-left", tone: "sendback", text: "Trimiți referatul înapoi la pasul anterior pentru corecții." },
  reject: { icon: "alert-circle", tone: "reject", text: "Respingi definitiv acest referat." },
};

export function ReferatActionPanel({
  requisitionId,
  stepLabel,
  needsClassification,
  canSendBack,
  initialMode,
  pdfHref,
}: {
  requisitionId: string;
  stepLabel: string;
  needsClassification: boolean;
  canSendBack: boolean;
  initialMode: Mode | null;
  pdfHref?: string;
}) {
  const [mode, setMode] = useState<Mode | null>(initialMode);

  return (
    <div className="avi-actionpanel">
      <div className="avi-actionpanel__head">
        <div className="avi-actionpanel__t">
          Pasul tău: <b>{stepLabel}</b>
        </div>
        <div className="avi-actionpanel__d">Alege o acțiune pentru a continua traseul.</div>
      </div>

      {!mode && (
        <div className="avi-actionpanel__btns">
          <Button variant="primary" fullWidth iconLeft={<Icon name="check" />} onClick={() => setMode("approve")}>
            Aprobă
          </Button>
          {canSendBack && (
            <Button variant="subtle" fullWidth iconLeft={<Icon name="corner-up-left" />} onClick={() => setMode("send_back")}>
              Trimite înapoi
            </Button>
          )}
          <Button variant="danger" fullWidth iconLeft={<Icon name="x" />} onClick={() => setMode("reject")}>
            Respinge
          </Button>
        </div>
      )}

      {mode && (
        <form action={actReferatAction} className="avi-actionpanel__confirm">
          <input type="hidden" name="requisitionId" value={requisitionId} />
          <div className={`avi-confirm-banner avi-confirm-banner--${BANNER[mode].tone}`}>
            <Icon name={BANNER[mode].icon} />
            <span>{BANNER[mode].text}</span>
          </div>

          {mode === "approve" && needsClassification && (
            <FormField label="Încadrare (tip achiziție)" required>
              <Select name="classification" required defaultValue="" placeholder="Alege tipul…" options={[
                { value: "achizitii", label: "Achiziții" },
                { value: "aprovizionare", label: "Aprovizionare" },
                { value: "servicii", label: "Servicii" },
              ]} />
            </FormField>
          )}

          {mode === "approve" ? (
            <FormField label="Comentariu" optional>
              <Textarea name="comment" rows={2} placeholder="Observații…" />
            </FormField>
          ) : (
            <FormField label={mode === "reject" ? "Motivul respingerii" : "Ce trebuie corectat"} required>
              <Textarea
                name="comment"
                rows={3}
                required
                minLength={5}
                placeholder={
                  mode === "reject"
                    ? "ex. Buget indisponibil în acest trimestru."
                    : "ex. Specifică modelul exact și anexează oferta."
                }
              />
            </FormField>
          )}

          <div className="avi-actionpanel__row">
            <Button variant="ghost" type="button" onClick={() => setMode(null)}>
              Anulează
            </Button>
            <div style={{ flex: 1 }} />
            <Button type="submit" name="action" value={mode} variant={mode === "reject" ? "danger" : "primary"}>
              {mode === "approve" ? "Confirmă aprobarea" : mode === "send_back" ? "Trimite înapoi" : "Respinge referatul"}
            </Button>
          </div>
        </form>
      )}

      <div className="avi-actionpanel__foot">
        {pdfHref && (
          <a className="avi-btn avi-btn--ghost avi-btn--sm" href={pdfHref} target="_blank" rel="noopener noreferrer">
            <span className="avi-btn__ico"><Icon name="download" /></span>
            <span>Descarcă PDF</span>
          </a>
        )}
      </div>
    </div>
  );
}
