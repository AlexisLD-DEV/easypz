import type { Locale } from "./i18n/translations";

const messages: Record<string, Record<Locale, string>> = {
  account_already_exists: {
    fr: "Un compte existe deja avec cet email.",
    en: "An account already exists with this email."
  },
  admin_required: {
    fr: "Acces reserve aux administrateurs.",
    en: "Administrators only."
  },
  audio_too_large: {
    fr: "Audio trop lourd. Limite : 12 Mo.",
    en: "Audio is too large. Limit: 12 MB."
  },
  audio_upload_failed: {
    fr: "Impossible d'envoyer l'audio pour le moment.",
    en: "Unable to upload the audio right now."
  },
  image_too_large: {
    fr: "Image trop lourde. Limite : 3 Mo.",
    en: "Image is too large. Limit: 3 MB."
  },
  image_upload_failed: {
    fr: "Impossible d'envoyer l'image pour le moment.",
    en: "Unable to upload the image right now."
  },
  email_send_failed: {
    fr: "Impossible d'envoyer le recap pour le moment.",
    en: "Unable to send the recap right now."
  },
  invalid_auth_body: {
    fr: "Verifie l'email et le mot de passe.",
    en: "Check the email and password."
  },
  invalid_credentials: {
    fr: "Email ou mot de passe incorrect.",
    en: "Incorrect email or password."
  },
  invalid_json: {
    fr: "La requete envoyee est invalide.",
    en: "The submitted request is invalid."
  },
  invalid_email: {
    fr: "Email invalide.",
    en: "Invalid email."
  },
  duplicate_answer: {
    fr: "Cette question a deja ete comptee.",
    en: "This question has already been counted."
  },
  not_authenticated: {
    fr: "Connecte-toi pour continuer.",
    en: "Log in to continue."
  },
  not_found: {
    fr: "Element introuvable.",
    en: "Item not found."
  },
  question_bank_item_not_found: {
    fr: "Question introuvable dans la banque.",
    en: "Question not found in the bank."
  },
  rate_limited: {
    fr: "Trop de tentatives. Reessaie dans quelques minutes.",
    en: "Too many attempts. Try again in a few minutes."
  },
  practice_attempt_finished: {
    fr: "Cet entrainement est deja termine.",
    en: "This practice attempt is already finished."
  },
  quiz_not_found: {
    fr: "Quiz introuvable.",
    en: "Quiz not found."
  },
  request_failed: {
    fr: "Action impossible pour le moment. Reessaie dans un instant.",
    en: "Action unavailable right now. Try again in a moment."
  },
  session_not_found: {
    fr: "Session introuvable.",
    en: "Session not found."
  },
  validation_error: {
    fr: "Verifie les informations envoyees.",
    en: "Check the submitted information."
  }
};

export function errorCodeFromReason(reason: unknown, fallback = "request_failed") {
  return reason instanceof Error ? reason.message : fallback;
}

export function userFacingErrorMessage(locale: Locale, reason: unknown, fallback = "request_failed") {
  const code = errorCodeFromReason(reason, fallback);
  return messages[code]?.[locale] ?? messages[fallback]?.[locale] ?? messages.request_failed[locale];
}
