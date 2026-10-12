export type QuizPublicationVisibility = "private" | "public" | "secret_link";
export type QuizPublicationStatus = "draft" | "published";

export type QuizPublicationInput = {
  visibility: QuizPublicationVisibility;
  status: QuizPublicationStatus;
};

export type QuizPublicationState = {
  isVisibleInGallery: boolean;
  isSecretLinkPublished: boolean;
  label: string;
  detail: string;
  actionLabel: string;
  actionIntent: "publish" | "publish_secret" | "unpublish";
  secondaryActionLabel?: string;
  secondaryActionIntent?: "publish" | "publish_secret" | "unpublish";
};

export type QuizPublicationLabels = {
  visibleGallery: string;
  visibleGalleryDetail: string;
  removeFromGallery: string;
  switchToSecret: string;
  secretActive: string;
  secretActiveDetail: string;
  disable: string;
  publishGallery: string;
  notVisible: string;
  publishSecret: string;
  draftDetail: string;
  privateDetail: string;
  secretOnlyDetail: string;
  mustBePublicDetail: string;
};

export const frenchPublicationLabels: QuizPublicationLabels = {
  visibleGallery: "Visible en galerie",
  visibleGalleryDetail: "Les eleves peuvent s'entrainer depuis la galerie publique.",
  removeFromGallery: "Retirer de la galerie",
  switchToSecret: "Passer en lien secret",
  secretActive: "Lien secret actif",
  secretActiveDetail: "Seules les personnes avec le lien peuvent s'entrainer.",
  disable: "Desactiver",
  publishGallery: "Publier en galerie",
  notVisible: "Non visible en galerie",
  publishSecret: "Publier par lien secret",
  draftDetail: "Le quiz est encore en brouillon.",
  privateDetail: "Le quiz est publie mais prive.",
  secretOnlyDetail: "Le quiz est accessible par lien secret uniquement.",
  mustBePublicDetail: "Le quiz doit etre public et publie pour apparaitre."
};

export function publicationState(
  quiz: QuizPublicationInput,
  labels: QuizPublicationLabels = frenchPublicationLabels
): QuizPublicationState {
  const isVisibleInGallery = quiz.visibility === "public" && quiz.status === "published";
  const isSecretLinkPublished = quiz.visibility === "secret_link" && quiz.status === "published";

  if (isVisibleInGallery) {
    return {
      isVisibleInGallery,
      isSecretLinkPublished,
      label: labels.visibleGallery,
      detail: labels.visibleGalleryDetail,
      actionLabel: labels.removeFromGallery,
      actionIntent: "unpublish",
      secondaryActionLabel: labels.switchToSecret,
      secondaryActionIntent: "publish_secret"
    };
  }

  if (isSecretLinkPublished) {
    return {
      isVisibleInGallery,
      isSecretLinkPublished,
      label: labels.secretActive,
      detail: labels.secretActiveDetail,
      actionLabel: labels.disable,
      actionIntent: "unpublish",
      secondaryActionLabel: labels.publishGallery,
      secondaryActionIntent: "publish"
    };
  }

  return {
    isVisibleInGallery,
    isSecretLinkPublished,
    label: labels.notVisible,
    detail: publicationDetail(quiz, labels),
    actionLabel: labels.publishGallery,
    actionIntent: "publish",
    secondaryActionLabel: labels.publishSecret,
    secondaryActionIntent: "publish_secret"
  };
}

function publicationDetail(quiz: QuizPublicationInput, labels: QuizPublicationLabels) {
  if (quiz.status === "draft") return labels.draftDetail;
  if (quiz.visibility === "private") return labels.privateDetail;
  if (quiz.visibility === "secret_link") return labels.secretOnlyDetail;
  return labels.mustBePublicDetail;
}
