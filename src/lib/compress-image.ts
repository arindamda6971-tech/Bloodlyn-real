/**
 * Shrinks a photo on the phone before it's uploaded, so patients never have to
 * think about file size and storage isn't filled with 5 MB photos. 1600 px keeps
 * handwriting readable. If anything goes wrong (a format the browser can't read,
 * such as HEIC on some phones) the original is used: a bigger upload is better
 * than a failed booking.
 */
const MAX_SIDE = 1600;
const TARGET_BYTES = 500 * 1024;
/** Lowest last: below this, small handwriting starts to blur. */
const QUALITIES = [0.8, 0.7, 0.6];

export function scaledSize(width: number, height: number, maxSide = MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= TARGET_BYTES) return file;

  try {
    // from-image applies the phone's rotation, so the photo isn't saved sideways.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = scaledSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    // JPEG has no transparency; without this a transparent PNG turns black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let best: Blob | null = null;
    for (const quality of QUALITIES) {
      const blob = await toJpeg(canvas, quality);
      if (blob) best = blob;
      if (blob && blob.size <= TARGET_BYTES) break;
    }
    if (!best || best.size >= file.size) return file;

    return new File([best], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch (error) {
    console.warn("Could not compress image, uploading the original:", error);
    return file;
  }
}
