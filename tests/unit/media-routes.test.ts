import { describe, expect, it } from "vitest";
import type { Env } from "../../worker/env";
import { readAudio, readImage } from "../../worker/media/routes";

describe("media routes", () => {
  it("reads an uploaded image by decoded media key", async () => {
    let requestedKey = "";
    const env = {
      MEDIA_BUCKET: {
        get: async (key: string) => {
          requestedKey = key;
          return {
            body: new Blob(["image-data"]).stream(),
            httpMetadata: { contentType: "image/webp" }
          };
        }
      }
    } as unknown as Env;

    const response = await readImage(env, "teachers%2Fuser%201%2Fimage.webp");

    expect(requestedKey).toBe("teachers/user 1/image.webp");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("image-data");
  });

  it("rejects missing image objects", async () => {
    const env = {
      MEDIA_BUCKET: {
        get: async () => null
      }
    } as unknown as Env;

    await expect(readImage(env, "missing.webp")).rejects.toMatchObject({
      status: 404,
      code: "image_not_found"
    });
  });

  it("reads an uploaded audio file by decoded media key", async () => {
    let requestedKey = "";
    const env = {
      MEDIA_BUCKET: {
        get: async (key: string) => {
          requestedKey = key;
          return {
            body: new Blob(["audio-data"]).stream(),
            httpMetadata: { contentType: "audio/mpeg" }
          };
        }
      }
    } as unknown as Env;

    const response = await readAudio(env, "teachers%2Fuser%201%2Flistening.mp3");

    expect(requestedKey).toBe("teachers/user 1/listening.mp3");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("audio-data");
  });

  it("rejects non-audio keys on the audio route", async () => {
    const env = {
      MEDIA_BUCKET: {
        get: async () => ({
          body: new Blob(["image-data"]).stream(),
          httpMetadata: { contentType: "image/webp" }
        })
      }
    } as unknown as Env;

    await expect(readAudio(env, "teachers%2Fuser%201%2Fimage.webp")).rejects.toMatchObject({
      status: 404,
      code: "audio_not_found"
    });
  });
});
