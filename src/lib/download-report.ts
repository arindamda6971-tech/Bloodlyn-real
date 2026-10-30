import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { getOfflineReport, saveReportOffline } from "@/lib/offline-storage";

/** Best-effort file extension for a report URL / blob. */
export const reportExtension = (url: string, blobType?: string) => {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  if (match && ["pdf", "jpg", "jpeg", "png", "webp"].includes(match[1].toLowerCase())) {
    return `.${match[1].toLowerCase()}`;
  }
  if (blobType?.includes("image/jpeg")) return ".jpg";
  if (blobType?.includes("image/png")) return ".png";
  return ".pdf";
};

/**
 * Parse a Supabase Storage URL (public or signed) into { bucket, path }
 * so we can pull the object through the SDK when a plain fetch is blocked.
 */
const parseStorageUrl = (url: string): { bucket: string; path: string } | null => {
  const m = url.match(/\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?([^/]+)\/(.+?)(?:\?|#|$)/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
};

/** Fetch the report bytes, falling back to the Supabase Storage SDK. */
const fetchReportBlob = async (url: string): Promise<Blob> => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  } catch (directError) {
    const parsed = parseStorageUrl(url);
    if (!parsed) throw directError;
    const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.path);
    if (error || !data) throw error || directError;
    return data;
  }
};

/** Trigger a real browser download from an in-memory blob. */
const saveBlobInBrowser = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
};

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.readAsDataURL(blob);
  });

export type DownloadResult = { ok: boolean; message: string };

/** Folder inside the phone's Documents where reports are saved. */
export const REPORTS_FOLDER = "BloodLyn Reports";

/** Phone notification once a report is saved, like other apps' "Download complete". */
const notifyDownloaded = async (filename: string) => {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    let perms = await LocalNotifications.checkPermissions();
    if (perms.display === "prompt" || perms.display === "prompt-with-rationale") {
      perms = await LocalNotifications.requestPermissions();
    }
    if (perms.display !== "granted") return;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 1_000_000),
          title: "Your report is downloaded",
          body: `${filename} is saved in Documents › ${REPORTS_FOLDER}.`,
          largeBody: `${filename} is saved in Documents › ${REPORTS_FOLDER}. Open it from your Files app.`,
          summaryText: "BloodLyn",
          smallIcon: "ic_stat_bloodlyn",
          largeIcon: "splash_icon",
          iconColor: "#4AB3F4",
          extra: { route: "/reports" },
        },
      ],
    });
  } catch (e) {
    // The in-app message still confirms the download.
    console.warn("Download notification failed:", e);
  }
};

/**
 * Download a lab report to the device.
 * - Uses the cached offline copy when present.
 * - On native, writes the file into Documents/BloodLyn Reports and shows a
 *   "Your report is downloaded" phone notification.
 * - On web, saves the bytes via a blob download (never navigates to Storage).
 */
export const downloadReport = async (
  reportUrl: string,
  filenameBase: string,
  cacheKey?: string,
): Promise<DownloadResult> => {
  let blob: Blob | null = null;

  if (cacheKey) {
    try {
      blob = await getOfflineReport(cacheKey);
    } catch {
      blob = null;
    }
  }

  if (!blob) {
    if (!navigator.onLine) {
      return { ok: false, message: "You're offline. Connect to the internet to download this report." };
    }
    try {
      blob = await fetchReportBlob(reportUrl);
      if (cacheKey) {
        saveReportOffline(cacheKey, blob).catch(() => undefined);
      }
    } catch (e) {
      console.error("Report fetch failed:", e);
      return { ok: false, message: "Could not download the report. Please try again." };
    }
  }

  const filename = `${filenameBase}${reportExtension(reportUrl, blob.type)}`;

  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const base64 = await blobToBase64(blob);
      await Filesystem.writeFile({
        path: `${REPORTS_FOLDER}/${filename}`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      void notifyDownloaded(filename);
      return { ok: true, message: `Report downloaded to Documents › ${REPORTS_FOLDER}` };
    } catch (e) {
      console.error("Native save failed:", e);
      // Last resort on device: hand the file to the system viewer.
      if (!window.open(reportUrl, "_system")) {
        window.open(reportUrl, "_blank");
      }
      return { ok: true, message: "Opening report..." };
    }
  }

  try {
    saveBlobInBrowser(blob, filename);
    return { ok: true, message: "Report downloaded" };
  } catch (e) {
    console.error("Browser save failed:", e);
    return { ok: false, message: "Could not save the report on this device." };
  }
};
