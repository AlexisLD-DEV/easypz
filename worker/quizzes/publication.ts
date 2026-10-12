export type PublicationIntent = "publish" | "publish_secret" | "unpublish";

export type ExistingPublication = {
  published_at: string | null;
  secret_token: string | null;
};

export type PublicationPatch = {
  visibility: "private" | "public" | "secret_link";
  status: "draft" | "published";
  secretToken: string | null;
  publishedAt: string;
};

export function publicationPatchForIntent(
  existing: ExistingPublication,
  intent: PublicationIntent,
  now = new Date().toISOString(),
  createSecretToken = () => ""
): PublicationPatch {
  if (intent === "publish") {
    return {
      visibility: "public",
      status: "published",
      secretToken: null,
      publishedAt: existing.published_at ?? now
    };
  }

  if (intent === "publish_secret") {
    return {
      visibility: "secret_link",
      status: "published",
      secretToken: existing.secret_token ?? createSecretToken(),
      publishedAt: existing.published_at ?? now
    };
  }

  return {
    visibility: "private",
    status: "draft",
    secretToken: null,
    publishedAt: existing.published_at ?? now
  };
}
