"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { actReferatAction } from "@/app/actions";
import { Button, FormField, Textarea, Select, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

type Mode = "approve" | "reject" | "send_back";

const BANNER: Record<Mode, { icon: "circle-check" | "corner-up-left" | "alert-circle"; tone: string; textKey: string }> = {
  approve: { icon: "circle-check", tone: "approve", textKey: "referatDetail.panel.banner.approve" },
  send_back: { icon: "corner-up-left", tone: "sendback", textKey: "referatDetail.panel.banner.sendBack" },
  reject: { icon: "alert-circle", tone: "reject", textKey: "referatDetail.panel.banner.reject" },
};

export function ReferatActionPanel({
  requisitionId,
  stepLabel,
  needsClassification,
  needsValuation,
  canSendBack,
  initialMode,
  pdfHref,
}: {
  requisitionId: string;
  stepLabel: string;
  needsClassification: boolean;
  needsValuation: boolean;
  canSendBack: boolean;
  initialMode: Mode | null;
  pdfHref?: string;
}) {
  const t = useTranslations();
  const [mode, setMode] = useState<Mode | null>(initialMode);

  return (
    <div className="avi-actionpanel">
      <div className="avi-actionpanel__head">
        <div className="avi-actionpanel__t">
          {t("referatDetail.panel.yourStep")} <b>{stepLabel}</b>
        </div>
        <div className="avi-actionpanel__d">{t("referatDetail.panel.chooseAction")}</div>
      </div>

      {!mode && (
        <div className="avi-actionpanel__btns">
          <Button variant="primary" fullWidth iconLeft={<Icon name="check" />} onClick={() => setMode("approve")}>
            {t("referatDetail.panel.approve")}
          </Button>
          {canSendBack && (
            <Button variant="subtle" fullWidth iconLeft={<Icon name="corner-up-left" />} onClick={() => setMode("send_back")}>
              {t("referatDetail.panel.sendBack")}
            </Button>
          )}
          <Button variant="danger" fullWidth iconLeft={<Icon name="x" />} onClick={() => setMode("reject")}>
            {t("referatDetail.panel.reject")}
          </Button>
        </div>
      )}

      {mode && (
        <form action={actReferatAction} className="avi-actionpanel__confirm">
          <input type="hidden" name="requisitionId" value={requisitionId} />
          <div className={`avi-confirm-banner avi-confirm-banner--${BANNER[mode].tone}`}>
            <Icon name={BANNER[mode].icon} />
            <span>{t(BANNER[mode].textKey)}</span>
          </div>

          {mode === "approve" && needsClassification && (
            <FormField label={t("referatDetail.panel.classification.label")} required>
              <Select name="classification" required defaultValue="" placeholder={t("referatDetail.panel.classification.placeholder")} options={[
                { value: "achizitii", label: t("referatDetail.panel.classification.achizitii") },
                { value: "aprovizionare", label: t("referatDetail.panel.classification.aprovizionare") },
                { value: "servicii", label: t("referatDetail.panel.classification.servicii") },
              ]} />
            </FormField>
          )}

          {mode === "approve" && needsValuation && (
            <>
              <FormField label={t("referatDetail.panel.valuation.valueLabel")} required>
                <Input name="valuationLei" type="number" min={0} step="0.01" required suffix="RON" placeholder={t("referatDetail.panel.valuation.valuePlaceholder")} />
              </FormField>
              <FormField label={t("referatDetail.panel.valuation.seapLabel")} required>
                <Select name="inSeapCatalog" required defaultValue="" placeholder={t("referatDetail.panel.valuation.seapPlaceholder")} options={[
                  { value: "da", label: t("referatDetail.panel.valuation.seapYes") },
                  { value: "nu", label: t("referatDetail.panel.valuation.seapNo") },
                ]} />
              </FormField>
              <div className="avi-form-note">
                <Icon name="info" />
                <span>{t("referatDetail.panel.valuation.hint")}</span>
              </div>
            </>
          )}

          {mode === "approve" ? (
            <FormField label={t("referatDetail.panel.comment.label")} optional optionalLabel={t("common.optional")}>
              <Textarea name="comment" rows={2} placeholder={t("referatDetail.panel.comment.placeholder")} />
            </FormField>
          ) : (
            <FormField label={mode === "reject" ? t("referatDetail.panel.rejectReason.label") : t("referatDetail.panel.sendBackReason.label")} required>
              <Textarea
                name="comment"
                rows={3}
                required
                minLength={5}
                placeholder={
                  mode === "reject"
                    ? t("referatDetail.panel.rejectReason.placeholder")
                    : t("referatDetail.panel.sendBackReason.placeholder")
                }
              />
            </FormField>
          )}

          <div className="avi-actionpanel__row">
            <Button variant="ghost" type="button" onClick={() => setMode(null)}>
              {t("common.cancel")}
            </Button>
            <div style={{ flex: 1 }} />
            <Button type="submit" name="action" value={mode} variant={mode === "reject" ? "danger" : "primary"}>
              {mode === "approve" ? t("referatDetail.panel.confirmApprove") : mode === "send_back" ? t("referatDetail.panel.confirmSendBack") : t("referatDetail.panel.confirmReject")}
            </Button>
          </div>
        </form>
      )}

      <div className="avi-actionpanel__foot">
        {pdfHref && (
          <a className="avi-btn avi-btn--ghost avi-btn--sm" href={pdfHref} target="_blank" rel="noopener noreferrer">
            <span className="avi-btn__ico"><Icon name="download" /></span>
            <span>{t("common.downloadPdf")}</span>
          </a>
        )}
      </div>
    </div>
  );
}
