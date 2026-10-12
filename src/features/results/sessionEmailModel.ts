type EmailSummaryState = {
  sending?: boolean;
  sentTo?: string | null;
  error?: string | null;
};

type EmailSummaryLabels = {
  send: string;
  sending: string;
  sent: string;
  notConfigured: string;
  failed: string;
};

export function emailSummaryButtonLabel(state: EmailSummaryState, labels: Pick<EmailSummaryLabels, "send" | "sending">) {
  return state.sending ? labels.sending : labels.send;
}

export function emailSummaryStatusMessage(state: EmailSummaryState, labels: Pick<EmailSummaryLabels, "sent" | "notConfigured" | "failed">) {
  if (state.sentTo) return labels.sent.replace("{email}", state.sentTo);
  if (state.error === "email_not_configured") return labels.notConfigured;
  if (state.error) return labels.failed;
  return null;
}
