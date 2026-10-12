import { describe, expect, it } from "vitest";
import { questionAudioUrl, questionImageUrl, questionMediaKind, questionMediaUrl } from "../../src/features/media/mediaUrl";

describe("media urls", () => {
  it("builds an encoded question image URL from a stored media key", () => {
    expect(questionMediaUrl("teachers/user 1/image #1.webp")).toBe("/api/media/images/teachers%2Fuser%201%2Fimage%20%231.webp");
    expect(questionImageUrl("teachers/user 1/image #1.webp")).toBe("/api/media/images/teachers%2Fuser%201%2Fimage%20%231.webp");
  });

  it("builds an encoded question audio URL from a stored media key", () => {
    expect(questionAudioUrl("teachers/user 1/listening #1.mp3")).toBe("/api/media/audio/teachers%2Fuser%201%2Flistening%20%231.mp3");
  });

  it("detects media kind from the stored extension", () => {
    expect(questionMediaKind("teachers/user-1/photo.PNG")).toBe("image");
    expect(questionMediaKind("teachers/user-1/audio.M4A")).toBe("audio");
    expect(questionMediaKind("teachers/user-1/file.pdf")).toBeNull();
  });

  it("returns null for empty or mismatched media keys", () => {
    expect(questionMediaUrl(null)).toBeNull();
    expect(questionMediaUrl("")).toBeNull();
    expect(questionImageUrl("teachers/user-1/listening.mp3")).toBeNull();
    expect(questionAudioUrl("teachers/user-1/image.webp")).toBeNull();
  });
});
