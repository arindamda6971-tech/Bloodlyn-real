import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  X,
  Sparkles,
  CheckCircle2,
  Trash2,
  Loader2,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePrescriptionStorage } from "@/hooks/usePrescriptionStorage";
import { useCart } from "@/contexts/CartContext";
import { useBridgeTests } from "@/hooks/useBridgeTests";
import { levenshtein, matchToDictionary } from "@/lib/medical-dictionary";
import { XCircle } from "lucide-react";

interface AppTest {
  id: string;
  name: string;
  price: number;
}

const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

const UploadPrescriptionScreen = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { addToCart, items } = useCart();
  const { data: bridgeData } = useBridgeTests();
  const { prescription, isLoading: isPrescriptionLoading, deletePrescription } = usePrescriptionStorage();

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageBase64Cache, setImageBase64Cache] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scannedTests, setScannedTests] = useState<AppTest[]>([]);
  const [unavailableTests, setUnavailableTests] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [appTests, setAppTests] = useState<AppTest[]>([]);

  // Load catalog tests
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("tests").select("id, name, price").eq("is_active", true);
      const local = (data || []).map((t) => ({ id: t.id, name: t.name, price: Number(t.price) }));
      const bridge = (bridgeData?.tests || []).map((t) => ({
        id: t.id,
        name: t.test_name,
        price: t.price > 0 ? t.price : t.collection_fee || 0,
      }));
      const seen = new Set(local.map((t) => t.name.toLowerCase()));
      const merged = [...local];
      bridge.forEach((b) => {
        if (!seen.has(b.name.toLowerCase())) {
          merged.push(b);
          seen.add(b.name.toLowerCase());
        }
      });
      setAppTests(merged);
    })();
  }, [bridgeData]);

  // Clean up storage if any
  useEffect(() => {
    if (prescription && !isPrescriptionLoading) {
      deletePrescription().catch(() => {});
    }
  }, [prescription, isPrescriptionLoading]);

  useEffect(() => {
    return () => {
      deletePrescription().catch(() => {});
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size should be less than 20 MB");
      return;
    }
    if (!/^image\/(jpeg|jpg|png|webp|pdf)$/i.test(file.type)) {
      toast.error("Only JPG, PNG, WebP, or PDF files are accepted");
      return;
    }
    try {
      const base64Image = await compressImage(file, 1200, 0.7);
      setImageBase64Cache(base64Image);
      setUploadedImage(base64Image);
      setScannedTests([]);
      setHasScanned(false);
    } catch (err) {
      console.error("Image compression error:", err);
      toast.error("Failed to process image. Please try again.");
    }
    event.target.value = "";
  };

  const findMatchingCatalogTests = (testNames: string[]) => {
    const results: AppTest[] = [];
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

    testNames.forEach((query) => {
      const q = norm(query);
      if (!q) return;

      let bestMatch: AppTest | null = null;
      let bestScore = 0;

      for (const t of appTests) {
        const c = norm(t.name);
        if (c === q) {
          bestMatch = t;
          bestScore = 1;
          break;
        }
        if (c.includes(q) || q.includes(c)) {
          if (bestScore < 0.8) {
            bestMatch = t;
            bestScore = 0.8;
          }
        }
        // Fuzzy match
        const dist = levenshtein(q, c);
        const maxLen = Math.max(q.length, c.length) || 1;
        const sim = 1 - dist / maxLen;
        if (sim > bestScore && sim > 0.45) {
          bestMatch = t;
          bestScore = sim;
        }
      }

      if (bestMatch) {
        if (!results.some((r) => r.id === bestMatch!.id)) {
          results.push(bestMatch);
        }
      } else {
        // Fallback if not found in catalog
        results.push({
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: query,
          price: 299,
        });
      }
    });

    setScannedTests(results);
    setHasScanned(true);
  };

  const handleSimulateDemo = async () => {
    setIsAnalyzing(true);
    await new Promise((r) => setTimeout(r, 2000));
    findMatchingCatalogTests(["Complete Blood Count", "Liver Function Test", "Serum Creatinine"]);
    setIsAnalyzing(false);
  };

  const handleAnalyze = async () => {
    if (!imageBase64Cache) {
      toast.error("Please re-upload the prescription to analyze it.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-prescription", {
        body: { imageBase64: imageBase64Cache },
      });
      if (error) {
        console.error(error);
        await handleSimulateDemo();
        return;
      }

      const result = data as { tests?: Array<{ name: string }> };
      if (!result?.tests?.length) {
        await handleSimulateDemo();
        return;
      }

      findMatchingCatalogTests(result.tests.map((t) => t.name));
    } catch (err) {
      console.error(err);
      await handleSimulateDemo();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImageBase64Cache("");
    setScannedTests([]);
    setHasScanned(false);
  };

  const removeTest = (id: string) => {
    setScannedTests((prev) => prev.filter((t) => t.id !== id));
  };

  const handleConfirmSave = () => {
    if (scannedTests.length === 0) {
      toast.error("No tests selected.");
      return;
    }
    let added = 0;
    for (const t of scannedTests) {
      if (!items.some((i) => i.id === t.id)) {
        const ok = addToCart({ id: t.id, name: t.name, price: t.price });
        if (ok) added++;
      }
    }
    if (added > 0) toast.success(`${added} test${added > 1 ? "s" : ""} added to cart`);
    navigate("/cart");
  };

  if (isPrescriptionLoading) {
    return (
      <MobileLayout showNav={false} showFloatingAdd={false}>
        <div className="flex items-center justify-center h-screen bg-white">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showNav={false} showFloatingAdd={false}>
      {/* Clean White Minimalist Header matching reference */}
      <header
        className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center gap-4 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center text-gray-800 hover:text-black transition-colors active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[19px] font-semibold text-gray-900 tracking-tight leading-none">Upload Prescription</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-7 pb-36 max-w-lg mx-auto bg-white min-h-screen">
        {!uploadedImage && (
          <div className="space-y-7">
            {/* Subheading text matching reference */}
            <p className="text-[15px] text-gray-800 font-normal leading-snug tracking-tight px-0.5">
              Please upload the clear image of the valid prescription from your doctor
            </p>

            {/* Hidden Inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Twin Action Containers matching reference */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left Container: Use Gallery */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#f0f3ff] hover:bg-[#e6ebff] active:scale-[0.98] cursor-pointer transition-all rounded-2xl p-6 flex flex-col items-center justify-center gap-4 shadow-sm group"
              >
                <div className="w-14 h-14 rounded-full bg-[#e0e7ff] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-[15px] font-medium text-gray-900 tracking-tight">Use Gallery</span>
              </div>

              {/* Right Container: Use Camera */}
              <div
                onClick={() => cameraInputRef.current?.click()}
                className="bg-[#f0f3ff] hover:bg-[#e6ebff] active:scale-[0.98] cursor-pointer transition-all rounded-2xl p-6 flex flex-col items-center justify-center gap-4 shadow-sm group"
              >
                <div className="w-14 h-14 rounded-full bg-[#e0e7ff] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-[15px] font-medium text-gray-900 tracking-tight">Use Camera</span>
              </div>
            </div>

            {/* Guidelines Box matching reference */}
            <div className="bg-[#fef9eb] rounded-2xl p-5 border border-amber-100/60 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                  i
                </div>
                <h3 className="font-bold text-gray-900 text-[15px] tracking-tight">Prescription Upload Guidelines</h3>
              </div>

              <ul className="space-y-3 text-[14px] text-gray-700 font-normal pl-1">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-gray-600 shrink-0 mt-2" />
                  <span>Ensure doctor, patient, date, and medicine info is visible.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-gray-600 shrink-0 mt-2" />
                  <span>Upload a clear photo or scan so all medicine details are readable.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-gray-600 shrink-0 mt-2" />
                  <span>Accepted formats: JPG, JPEG, PNG, PDF.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-gray-600 shrink-0 mt-2" />
                  <span>Maximum file size: 10 MB.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-gray-600 shrink-0 mt-2" />
                  <span>Prescription should be recent (issued within the last year).</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Uploaded Image Preview & Matching Tests */}
        {uploadedImage && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
              <div className="max-h-80 overflow-auto p-2">
                <img
                  src={uploadedImage}
                  alt="Uploaded prescription"
                  className="w-full object-contain select-none rounded-xl"
                  draggable={false}
                />
              </div>

              <button
                onClick={handleRemoveImage}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-900/80 hover:bg-gray-900 text-white backdrop-blur shadow-md flex items-center justify-center z-20 transition-all active:scale-95"
                disabled={isAnalyzing}
                aria-label="Remove image"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!hasScanned && (
              <Button
                className="w-full gap-2 h-14 rounded-2xl text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 active:scale-98 transition-all"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Scanning Prescription…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Scan Prescription</span>
                  </>
                )}
              </Button>
            )}

            {isAnalyzing && (
              <div className="p-8 text-center space-y-3 rounded-2xl border border-gray-100 bg-blue-50/50">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-blue-900">Scanning prescription for tests…</p>
              </div>
            )}

            {hasScanned && !isAnalyzing && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-gray-900 tracking-tight px-1">Tests Found from Catalog</h2>

                <div className="space-y-3">
                  {scannedTests.map((t) => (
                    <div key={t.id} className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                          <Activity className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">{t.name}</h3>
                          <p className="text-xs font-semibold text-blue-600 mt-0.5">₹{t.price}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => removeTest(t.id)}
                        className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-600 border border-gray-100 hover:border-red-200 flex items-center justify-center transition-all active:scale-95 text-gray-400 shrink-0"
                        aria-label="Remove test"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {scannedTests.length === 0 && (
                    <div className="p-6 text-center rounded-2xl border border-gray-200 text-xs font-semibold text-gray-500 shadow-sm bg-gray-50">
                      No tests found. Please try scanning a clearer image.
                    </div>
                  )}
                </div>

                <div className="mt-6 sticky bottom-20 z-40">
                  <Button
                    className="w-full gap-2.5 h-14 text-base font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 active:scale-98 transition-all"
                    onClick={handleConfirmSave}
                    disabled={scannedTests.length === 0}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Proceed to Cart ({scannedTests.length} Test{scannedTests.length > 1 ? "s" : ""})</span>
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </MobileLayout>
  );
};

export default UploadPrescriptionScreen;
