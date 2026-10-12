type UploadMediaResponse = {
  key?: string;
  error?: string;
};

export async function uploadQuestionImage(file: File, fetcher: typeof fetch = fetch) {
  return uploadQuestionMedia(file, "/api/media/images", "image_upload_failed", fetcher);
}

export async function uploadQuestionAudio(file: File, fetcher: typeof fetch = fetch) {
  return uploadQuestionMedia(file, "/api/media/audio", "audio_upload_failed", fetcher);
}

async function uploadQuestionMedia(file: File, path: string, fallbackError: string, fetcher: typeof fetch) {
  const form = new FormData();
  form.set("file", file);

  const response = await fetcher(path, {
    method: "POST",
    body: form
  });
  const data = await response.json() as UploadMediaResponse;

  if (!response.ok || !data.key) {
    throw new Error(data.error ?? fallbackError);
  }

  return data.key;
}
