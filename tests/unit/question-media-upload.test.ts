import { describe, expect, it } from "vitest";
import { uploadQuestionAudio, uploadQuestionImage } from "../../src/features/media/questionMediaUpload";

describe("question media upload", () => {
  it("uploads an image file and returns the stored media key", async () => {
    let requestedUrl = "";
    let requestedMethod = "";
    let uploadedFileName = "";
    const fetcher: typeof fetch = async (url, init) => {
      requestedUrl = String(url);
      requestedMethod = init?.method ?? "";
      uploadedFileName = ((init?.body as FormData).get("file") as File).name;
      return Response.json({ key: "teachers/user-1/image.webp" });
    };

    const file = new File(["image"], "image.webp", { type: "image/webp" });
    const mediaKey = await uploadQuestionImage(file, fetcher);

    expect(requestedUrl).toBe("/api/media/images");
    expect(requestedMethod).toBe("POST");
    expect(uploadedFileName).toBe("image.webp");
    expect(mediaKey).toBe("teachers/user-1/image.webp");
  });

  it("rejects failed uploads", async () => {
    const fetcher: typeof fetch = async () => Response.json({ error: "image_too_large" }, { status: 400 });

    await expect(uploadQuestionImage(new File(["image"], "big.webp"), fetcher)).rejects.toThrow("image_too_large");
  });

  it("uploads an audio file and returns the stored media key", async () => {
    let requestedUrl = "";
    let requestedMethod = "";
    let uploadedFileName = "";
    const fetcher: typeof fetch = async (url, init) => {
      requestedUrl = String(url);
      requestedMethod = init?.method ?? "";
      uploadedFileName = ((init?.body as FormData).get("file") as File).name;
      return Response.json({ key: "teachers/user-1/audio.mp3" });
    };

    const file = new File(["audio"], "listening.mp3", { type: "audio/mpeg" });
    const mediaKey = await uploadQuestionAudio(file, fetcher);

    expect(requestedUrl).toBe("/api/media/audio");
    expect(requestedMethod).toBe("POST");
    expect(uploadedFileName).toBe("listening.mp3");
    expect(mediaKey).toBe("teachers/user-1/audio.mp3");
  });

  it("rejects failed audio uploads", async () => {
    const fetcher: typeof fetch = async () => Response.json({ error: "audio_too_large" }, { status: 400 });

    await expect(uploadQuestionAudio(new File(["audio"], "big.mp3"), fetcher)).rejects.toThrow("audio_too_large");
  });
});
