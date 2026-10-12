import { useI18n } from "../../i18n/useI18n";
import type { QuestionBankItem } from "./questionBankModel";

export type SimilarQuestionDecision = "add_anyway" | "skip" | "view_bank";

export function SimilarQuestionDialog({
  currentPrompt,
  similar,
  onDecision
}: {
  currentPrompt: string;
  similar: QuestionBankItem;
  onDecision: (decision: SimilarQuestionDecision) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-dialog similar-dialog" role="dialog" aria-modal="true" aria-labelledby="similar-question-title">
        <div>
          <p className="eyebrow">{t("bank.title")}</p>
          <h2 id="similar-question-title">{t("bank.similarTitle")}</h2>
        </div>
        <div className="similar-question-grid">
          <article>
            <p className="eyebrow">{t("bank.currentQuestion")}</p>
            <strong>{currentPrompt}</strong>
          </article>
          <article>
            <p className="eyebrow">{t("bank.bankQuestion")}</p>
            <strong>{similar.prompt}</strong>
          </article>
        </div>
        <div className="dialog-actions">
          <button className="secondary-action" type="button" onClick={() => onDecision("view_bank")}>{t("bank.viewBank")}</button>
          <button className="secondary-action" type="button" onClick={() => onDecision("skip")}>{t("bank.skip")}</button>
          <button type="button" onClick={() => onDecision("add_anyway")}>{t("bank.addAnyway")}</button>
        </div>
      </section>
    </div>
  );
}
