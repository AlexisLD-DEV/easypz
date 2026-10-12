import { describe, expect, it } from "vitest";
import { publicationState } from "../../src/features/dashboard/quizPublicationModel";
import { publicationPatchForIntent } from "../../worker/quizzes/publication";

describe("quiz publication model", () => {
  it("marks only public published quizzes as visible in the public gallery", () => {
    expect(publicationState({ visibility: "public", status: "published" })).toMatchObject({
      isVisibleInGallery: true,
      label: "Visible en galerie",
      actionLabel: "Retirer de la galerie"
    });

    expect(publicationState({ visibility: "private", status: "published" })).toMatchObject({
      isVisibleInGallery: false,
      label: "Non visible en galerie",
      actionLabel: "Publier en galerie"
    });

    expect(publicationState({ visibility: "public", status: "draft" })).toMatchObject({
      isVisibleInGallery: false,
      label: "Non visible en galerie"
    });

    expect(publicationState({ visibility: "secret_link", status: "published" })).toMatchObject({
      isVisibleInGallery: false,
      isSecretLinkPublished: true,
      label: "Lien secret actif",
      actionLabel: "Desactiver"
    });
  });

  it("builds minimal publication patches for dashboard quick actions", () => {
    const now = "2026-05-19T01:00:00.000Z";

    expect(publicationPatchForIntent({ published_at: null, secret_token: null }, "publish", now)).toEqual({
      visibility: "public",
      status: "published",
      secretToken: null,
      publishedAt: now
    });

    expect(publicationPatchForIntent({ published_at: "2026-05-18T12:00:00.000Z", secret_token: "old-secret" }, "publish", now)).toEqual({
      visibility: "public",
      status: "published",
      secretToken: null,
      publishedAt: "2026-05-18T12:00:00.000Z"
    });

    expect(publicationPatchForIntent({ published_at: now, secret_token: "old-secret" }, "unpublish", now)).toEqual({
      visibility: "private",
      status: "draft",
      secretToken: null,
      publishedAt: now
    });
  });

  it("builds secret-link publication patches with reusable tokens", () => {
    const now = "2026-05-19T01:00:00.000Z";

    expect(publicationPatchForIntent(
      { published_at: null, secret_token: null },
      "publish_secret",
      now,
      () => "generated-secret"
    )).toEqual({
      visibility: "secret_link",
      status: "published",
      secretToken: "generated-secret",
      publishedAt: now
    });

    expect(publicationPatchForIntent(
      { published_at: "2026-05-18T12:00:00.000Z", secret_token: "existing-secret" },
      "publish_secret",
      now,
      () => "generated-secret"
    )).toEqual({
      visibility: "secret_link",
      status: "published",
      secretToken: "existing-secret",
      publishedAt: "2026-05-18T12:00:00.000Z"
    });
  });
});
