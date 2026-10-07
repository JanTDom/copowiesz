export interface VideoMetadata { durationSec: number; width: number; height: number; durationEstimated: boolean }

function waitFor(video: HTMLVideoElement, event: string, action?: () => void, timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer); video.removeEventListener(event, ok); video.removeEventListener("error", failed);
      error ? reject(error) : resolve();
    };
    const ok = () => finish();
    const failed = () => finish(new Error("Nie udało się odczytać filmu. Spróbuj krótkiego klipu MP4 lub WebM."));
    const timer = setTimeout(() => finish(new Error("Odczyt filmu trwał zbyt długo. Spróbuj krótszego klipu MP4 lub WebM.")), timeout);
    video.addEventListener(event, ok, { once: true }); video.addEventListener("error", failed, { once: true });
    try { action?.(); } catch (error) { finish(error instanceof Error ? error : new Error("Nie udało się odczytać filmu.")); }
  });
}

async function openedVideo(blob: Blob) {
  const video = document.createElement("video");
  const url = URL.createObjectURL(blob);
  video.muted = true; video.playsInline = true; video.preload = "auto";
  const dispose = () => { video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url); };
  try {
    await waitFor(video, "loadeddata", () => { video.src = url; video.load(); });
    return { video, dispose };
  } catch (error) { dispose(); throw error; }
}

async function finiteDuration(video: HTMLVideoElement, hint?: number): Promise<{ durationSec: number; durationEstimated: boolean }> {
  if (Number.isFinite(video.duration) && video.duration > 0) return { durationSec: video.duration, durationEstimated: false };
  // Some MediaRecorder WebM files only expose duration after seeking to their end.
  try {
    await waitFor(video, "seeked", () => { video.currentTime = 1e10; }, 5000);
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : video.currentTime;
    if (Number.isFinite(duration) && duration > 0 && duration < 3600) return { durationSec: duration, durationEstimated: false };
  } catch { /* The measured recording interval remains an explicitly marked fallback. */ }
  if (hint && Number.isFinite(hint) && hint > 0) return { durationSec: hint, durationEstimated: true };
  throw new Error("Nie udało się ustalić długości filmu. Wybierz krótki plik MP4 z zapisanymi metadanymi.");
}

export async function readVideoMetadata(blob: Blob, durationHint?: number): Promise<VideoMetadata> {
  const { video, dispose } = await openedVideo(blob);
  try {
    const duration = await finiteDuration(video, durationHint);
    return { ...duration, width: video.videoWidth, height: video.videoHeight };
  } finally { dispose(); }
}

export function blobDataUrl(blob: Blob, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Nie udało się przygotować filmu do analizy."));
    reader.onerror = () => reject(new Error("Nie udało się odczytać filmu."));
    reader.readAsDataURL(new Blob([blob], { type: mimeType }));
  });
}

export async function extractVideoFrames(blob: Blob, durationSec: number): Promise<{ frames: string[]; frameTimes: number[] }> {
  const { video, dispose } = await openedVideo(blob);
  const frames: string[] = []; const frameTimes: number[] = [];
  const canvas = document.createElement("canvas");
  try {
    await finiteDuration(video, durationSec);
    const context = canvas.getContext("2d");
    if (!context || !video.videoWidth || !video.videoHeight) throw new Error("Ta przeglądarka nie mogła przygotować klatek filmu.");
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    for (let index = 0; index < 6; index += 1) {
      const time = Math.max(0, (durationSec - Math.min(0.1, durationSec / 4)) * index / 5);
      if (Math.abs(video.currentTime - time) > 0.01 || video.readyState < 2) await waitFor(video, "seeked", () => { video.currentTime = time; }, 8000);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL("image/jpeg", 0.68);
      if (data.length > 230000) data = canvas.toDataURL("image/jpeg", 0.4);
      if (data.length > 230000) throw new Error("Klatki są zbyt duże do analizy. Zapisz klip w niższej rozdzielczości.");
      frames.push(data); frameTimes.push(Number(time.toFixed(3)));
    }
    return { frames, frameTimes };
  } finally { dispose(); }
}

export function recorderMimeType(): string | undefined {
  return ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
}
