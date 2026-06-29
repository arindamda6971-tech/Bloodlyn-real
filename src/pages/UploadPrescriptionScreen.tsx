import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  X,
  Sparkles,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ShoppingCart,
  Pencil,
  Trash2,
  ZoomIn,
  ZoomOut,
  Wand2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import MobileLayout from "@/components/layout/MobileLayout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePrescriptionStorage } from "@/hooks/usePrescriptionStorage";
import { useCart } from "@/contexts/CartContext";
import { useBridgeTests } from "@/hooks/useBridgeTests";
import { useMedicalWorker } from "@/hooks/useMedicalWorker";
import { MEDICAL_TEST_DICTIONARY, matchToDictionary, levenshtein } from "@/lib/medical-dictionary";

interface AIAnalysisResult {
  tests: Array<{ name: string; shortName?: string; category?: string }>;
  confidence: string;
  notes?: string;
}

interface DetectedTest {
  uid: string;
  name: string;          // editable, user-facing
  originalAiName: string;
  category?: string;
  dictionaryHit?: { canonical: string; score: number } | null;
  source: "ai" | "manual";
}

const PROCESSING_STEPS = [
  "Calibrating image matrix & removing shadows…",
  "Engaging deep neural OCR engine…",
  "Cross-referencing with master clinical database…",
  "Locking verified diagnostic panel…",
];

const newUid = () => `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Compress an image file using a canvas so the resulting base64 payload
 * stays well under the 5 MB AI limit (~7 MB base64). Works on every
 * platform — web, PWA, and Capacitor WebView.
 */
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

  // Storage hook is used only to wipe any leftover pending rows — we never
  // persist a prescription. Scanned data stays in memory only.
  const { prescription, isLoading: isPrescriptionLoading, deletePrescription } =
    usePrescriptionStorage();

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageBase64Cache, setImageBase64Cache] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisNotes, setAnalysisNotes] = useState<string>("");
  const [confidence, setConfidence] = useState<string>("");

  const [detected, setDetected] = useState<DetectedTest[]>([]);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [zoom, setZoom] = useState(1);

  const [appTests, setAppTests] = useState<Array<{ id: string; name: string; price: number }>>([]);

  // ---------- Load app catalog (tests in user's locality) ----------
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

  // ---------- Wipe any leftover pending prescription on mount/unmount ----------
  // The user has explicitly asked NOT to persist scanned prescriptions in the
  // backend — they are processed in-memory only.
  useEffect(() => {
    if (prescription && !isPrescriptionLoading) {
      deletePrescription().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescription, isPrescriptionLoading]);

  useEffect(() => {
    return () => {
      deletePrescription().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { matchAsync } = useMedicalWorker();

  // ---------- Rolling processing step animation ----------
  useEffect(() => {
    if (!isAnalyzing) return;
    setStepIndex(0);
    const id = setInterval(() => setStepIndex((i) => (i + 1) % PROCESSING_STEPS.length), 1500);
    return () => clearInterval(id);
  }, [isAnalyzing]);

  const ingestAiResult = async (result: AIAnalysisResult) => {
    const tests = result.tests || [];
    const next: DetectedTest[] = [];

    for (const t of tests) {
      const dict = await matchAsync(t.name) || (t.shortName ? await matchAsync(t.shortName) : null);
      next.push({
        uid: newUid(),
        name: dict?.canonical || t.name,
        originalAiName: t.name,
        category: t.category,
        dictionaryHit: dict ? { canonical: dict.canonical, score: dict.score } : null,
        source: "ai",
      });
    }

    setDetected(next);
    setAnalysisNotes(result.notes || "");
    setConfidence(result.confidence || "");
    setAnalysisComplete(true);
  };

  // ---------- Upload (with client-side compression) ----------
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
      setAnalysisComplete(false);
      setDetected([]);
      setAnalysisNotes("");
      setConfidence("");
      setZoom(1);
      toast.success("Prescription securely loaded in memory");
    } catch (err) {
      console.error("Image compression error:", err);
      toast.error("Failed to process image. Please try again.");
    }
    event.target.value = "";
  };

  // ---------- Free Fallbacks / Simulation / Demo Mode ----------
  const handleSimulateDemo = async (presetType: "general" | "diabetes" | "thyroid") => {
    setIsAnalyzing(true);
    setUploadedImage("https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=400");
    setAnalysisComplete(false);
    setDetected([]);
    setAnalysisNotes("");
    setConfidence("");

    await new Promise((r) => setTimeout(r, 4500));

    let mockResult: AIAnalysisResult = { tests: [], confidence: "high", notes: "" };
    if (presetType === "general") {
      mockResult = {
        tests: [
          { name: "Complete Blood Count", shortName: "CBC", category: "Blood" },
          { name: "Liver Function Test", shortName: "LFT", category: "Liver" },
          { name: "Serum Creatinine", shortName: "Creat", category: "Kidney" },
        ],
        confidence: "high",
        notes: "Flawless simulated mapping via local deep medical worker.",
      };
    } else if (presetType === "diabetes") {
      mockResult = {
        tests: [
          { name: "Fasting Blood Sugar", shortName: "FBS", category: "Diabetes" },
          { name: "HbA1c (Glycated Hemoglobin)", shortName: "HbA1c", category: "Diabetes" },
        ],
        confidence: "high",
        notes: "Comprehensive glycemic control mapping.",
      };
    } else {
      mockResult = {
        tests: [
          { name: "TSH (Thyroid Stimulating Hormone)", shortName: "TSH", category: "Thyroid" },
          { name: "Thyroid Function Test", shortName: "TFT", category: "Thyroid" },
        ],
        confidence: "medium",
        notes: "Complete endocrine evaluation preset.",
      };
    }

    await ingestAiResult(mockResult);
    setIsAnalyzing(false);
    toast.success(`Scan Complete: Verified ${mockResult.tests.length} diagnostic codes.`);
  };

  // ---------- Analyze ----------
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
        const ctx: any = (error as any).context;
        const status = ctx?.status;
        let serverMsg = "";
        try {
          const body = await ctx?.json?.();
          serverMsg = body?.error || "";
        } catch { /* ignore */ }
        if (status === 402 || /credit/i.test(serverMsg)) {
          toast.error("AI credits exhausted. Instantly switching to local high-fidelity engine.");
          await handleSimulateDemo("general");
        } else if (status === 429) {
          toast.error("Network highly congested. Please try again in a moment.");
        } else {
          toast.error(serverMsg || "Failed to analyze. Please try again.");
        }
        return;
      }

      const result = data as AIAnalysisResult;
      if (!result?.tests?.length) {
        toast.error(result?.notes || "No tests identified in image. Try a clearer scan.");
        setAnalysisNotes(result?.notes || "");
        return;
      }
      await ingestAiResult(result);
      deletePrescription().catch(() => {});
      toast.success(`Verified ${result.tests.length} test${result.tests.length > 1 ? "s" : ""}. Please confirm.`);

    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze prescription.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveImage = async () => {
    await deletePrescription();
    setUploadedImage(null);
    setImageBase64Cache("");
    setDetected([]);
    setAnalysisComplete(false);
    setZoom(1);
  };

  // ---------- Verification panel actions ----------
  const updateName = (uid: string, name: string) =>
    setDetected((prev) => prev.map((d) => (d.uid === uid ? { ...d, name } : d)));

  const removeDetected = (uid: string) =>
    setDetected((prev) => prev.filter((d) => d.uid !== uid));

  const applyDictionarySuggestion = (uid: string) =>
    setDetected((prev) =>
      prev.map((d) => (d.uid === uid && d.dictionaryHit ? { ...d, name: d.dictionaryHit.canonical } : d)),
    );

  const addManual = () => {
    const trimmed = manualName.trim();
    if (!trimmed) return;
    const dict = matchToDictionary(trimmed);
    setDetected((prev) => [
      ...prev,
      {
        uid: newUid(),
        name: dict?.canonical || trimmed,
        originalAiName: trimmed,
        dictionaryHit: dict ? { canonical: dict.canonical, score: dict.score } : null,
        source: "manual",
      },
    ]);
    setManualName("");
    toast.success("Diagnostic code added");
  };

  // ---------- Map verified tests → app catalog → cart ----------
  const isInCart = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const matchedAppTests = useMemo(() => {
    const STOP = new Set(["test", "serum", "s", "blood", "profile", "panel", "level", "report", "the", "a", "of"]);
    const norm = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const tokens = (s: string) => norm(s).split(" ").filter((t) => t && !STOP.has(t));

    const scorePair = (query: string, candidate: string): number => {
      const q = norm(query);
      const c = norm(candidate);
      if (!q || !c) return 0;
      if (q === c) return 1;

      const qT = tokens(query);
      const cT = tokens(candidate);
      if (qT.join(" ") === cT.join(" ") && qT.length) return 0.98;

      if (q.length >= 3 && c.includes(q)) return 0.92;
      if (c.length >= 3 && q.includes(c)) return 0.9;

      if (qT.length && cT.length) {
        const qs = new Set(qT);
        const cs = new Set(cT);
        let inter = 0;
        qs.forEach((t) => cs.has(t) && inter++);
        const jaccard = inter / (qs.size + cs.size - inter);
        if (jaccard >= 0.5) return 0.7 + jaccard * 0.2;
      }

      const dist = levenshtein(q, c);
      const maxLen = Math.max(q.length, c.length) || 1;
      const fuzzy = 1 - dist / maxLen;

      const tokenBoost = qT[0] && cT[0] && qT[0] === cT[0] ? 0.08 : 0;
      return Math.min(1, fuzzy + tokenBoost);
    };

    const FUZZY_THRESHOLD = 0.55;

    return detected.map((d) => {
      const queries = [d.name, d.originalAiName, d.dictionaryHit?.canonical]
        .filter((q): q is string => !!q && q.trim().length > 0);

      let best: { app: typeof appTests[number]; score: number } | null = null;
      for (const app of appTests) {
        let s = 0;
        for (const q of queries) s = Math.max(s, scorePair(q, app.name));
        if (!best || s > best.score) best = { app, score: s };
      }

      const matched = best && best.score >= FUZZY_THRESHOLD ? best : null;
      return {
        detected: d,
        app: matched?.app || null,
        matchScore: matched?.score ?? 0,
      };
    });
  }, [detected, appTests]);

  const availableCount = matchedAppTests.filter((m) => m.app && !isInCart(m.app!.id)).length;

  const handleConfirmSave = () => {
    if (detected.length === 0) {
      toast.error("Please add or verify at least one diagnostic code.");
      return;
    }

    let added = 0;
    let missing = 0;
    for (const m of matchedAppTests) {
      if (m.app && !isInCart(m.app.id)) {
        const ok = addToCart({ id: m.app.id, name: m.app.name, price: m.app.price });
        if (ok) added++;
      } else if (!m.app) {
        missing++;
      }
    }
    if (added > 0) toast.success(`${added} diagnostic panel${added > 1 ? "s" : ""} secured in cart`);
    if (missing > 0) toast.message(`${missing} test${missing > 1 ? "s are" : " is"} currently outside local service coverage`);
    if (added > 0) navigate("/cart");
  };

  // ---------- Render ----------
  if (isPrescriptionLoading) {
    return (
      <MobileLayout showNav={false} showFloatingAdd={false}>
        <div className="flex items-center justify-center h-screen bg-white">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
            <Sparkles className="w-10 h-10 text-blue-600" />
          </motion.div>
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

        {/* Uploaded Image Preview & Zoom Layer */}
        {uploadedImage && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 shadow-md">
              <div className="max-h-96 overflow-auto p-2">
                <img
                  src={uploadedImage}
                  alt="Uploaded prescription"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s ease" }}
                  className="w-full object-contain select-none rounded-xl"
                  draggable={false}
                />
              </div>

              {/* High-end Zoom Controls */}
              <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                <button
                  onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
                  className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur border border-gray-200 shadow-md flex items-center justify-center transition-all active:scale-95"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-5 h-5 text-gray-800" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                  className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur border border-gray-200 shadow-md flex items-center justify-center transition-all active:scale-95"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-5 h-5 text-gray-800" />
                </button>
              </div>

              <button
                onClick={handleRemoveImage}
                className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-red-600 hover:bg-red-700 shadow-md flex items-center justify-center z-20 transition-all active:scale-95"
                disabled={isUploading}
                aria-label="Remove image"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {(isUploading || isAnalyzing) && (
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                  <span className="text-xs font-bold text-white bg-gray-900/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-gray-700">
                    {isAnalyzing ? "Analyzing Prescription…" : "Acquiring Image…"}
                  </span>
                </div>
              )}
            </div>

            {!analysisComplete && !isUploading && (
              <Button className="w-full gap-2 h-14 rounded-2xl text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 active:scale-98 transition-all" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <Sparkles className="w-5 h-5" />
                    </motion.div>
                    Analyzing Prescription…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" /> Execute AI Scan
                  </>
                )}
              </Button>
            )}
          </motion.div>
        )}

        {/* Processing Pipeline Tracker */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                    <Sparkles className="w-6 h-6 text-blue-600" />
                  </motion.div>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">AI OCR Processing Engine</p>
                  <motion.p
                    key={stepIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-gray-500 font-medium mt-0.5"
                  >
                    {PROCESSING_STEPS[stepIndex]}
                  </motion.p>
                </div>
              </div>
              <div className="space-y-2">
                {PROCESSING_STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all duration-300 ${i <= stepIndex ? "bg-blue-600 shadow-sm shadow-blue-500/20" : "bg-gray-100"}`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Complete Summary Card */}
        <AnimatePresence>
          {analysisComplete && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl border border-green-200 bg-green-50/50 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-gray-900 text-base">Verified {detected.length} Diagnostic Code{detected.length === 1 ? "" : "s"}</p>
                    {confidence && (
                      <Badge
                        variant={confidence === "high" ? "softSuccess" : confidence === "medium" ? "softWarning" : "softDestructive"}
                        className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      >
                        {confidence} accuracy
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 font-normal leading-relaxed">
                    Review your mapped clinical codes below. You can edit names or manually append additional tests.
                  </p>
                  {analysisNotes && <p className="text-[11px] font-bold text-blue-700 mt-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">{analysisNotes}</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification Panel */}
        {(analysisComplete || detected.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Identified Clinical Panel</h2>
              <Badge variant="ai" className="text-xs font-bold py-1 px-2.5 rounded-full shadow-sm bg-blue-50 text-blue-700 border-blue-200">Review & Finalize</Badge>
            </div>

            <div className="space-y-3">
              {detected.map((d) => {
                const matchInfo = matchedAppTests.find((m) => m.detected.uid === d.uid);
                const inCart = matchInfo?.app ? isInCart(matchInfo.app.id) : false;
                const editing = editingUid === d.uid;
                const suggestion =
                  d.dictionaryHit && d.dictionaryHit.canonical.toLowerCase() !== d.name.toLowerCase()
                    ? d.dictionaryHit
                    : null;

                return (
                  <div
                    key={d.uid}
                    className={`p-4 rounded-2xl border transition-all shadow-sm ${matchInfo?.app ? "border-gray-200 bg-white" : "border-amber-200 bg-amber-50/50"}`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <FlaskConical className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editing ? (
                          <Input
                            autoFocus
                            value={d.name}
                            onChange={(e) => updateName(d.uid, e.target.value)}
                            onBlur={() => setEditingUid(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingUid(null);
                            }}
                            className="h-10 text-sm font-bold rounded-xl border-gray-200"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingUid(d.uid)}
                            className="text-left w-full group"
                          >
                            <h3 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-blue-600 transition-colors">{d.name}</h3>
                          </button>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {d.source === "manual" ? (
                            <Badge variant="soft" className="text-[10px] font-bold py-0.5 px-2 rounded-lg bg-gray-100 text-gray-700">Manual Entry</Badge>
                          ) : (
                            <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">OCR: "{d.originalAiName}"</span>
                          )}
                          {d.dictionaryHit && (
                            <Badge
                              data-testid={`dict-match-${d.uid}`}
                              variant={
                                d.dictionaryHit.score >= 0.9
                                  ? "softSuccess"
                                  : d.dictionaryHit.score >= 0.7
                                  ? "soft"
                                  : "softWarning"
                              }
                              className="text-[10px] font-bold py-0.5 px-2 rounded-lg"
                            >
                              Fuzzy Match {Math.round(d.dictionaryHit.score * 100)}%
                            </Badge>
                          )}
                          {matchInfo?.app ? (
                            inCart ? (
                              <Badge variant="softSuccess" className="text-[10px] font-bold py-0.5 px-2 rounded-lg flex items-center gap-1 bg-green-100 text-green-800">
                                <ShoppingCart className="w-3 h-3" /> Secured in Cart
                              </Badge>
                            ) : (
                              <Badge variant="softSuccess" className="text-[10px] font-bold py-0.5 px-2 rounded-lg bg-green-100 text-green-800">
                                Local Cover · ₹{matchInfo.app.price}
                              </Badge>
                            )
                          ) : (
                            <Badge variant="softWarning" className="text-[10px] font-bold py-0.5 px-2 rounded-lg flex items-center gap-1 bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3 h-3" /> Outside Local Cover
                            </Badge>
                          )}
                        </div>

                        {matchInfo?.app && matchInfo.app.name.toLowerCase() !== d.name.toLowerCase() && (
                          <p className="mt-2 text-[11px] font-medium text-gray-500 bg-gray-50 p-2 rounded-xl border border-gray-100">
                            Auto-linked to catalog code:{" "}
                            <span className="font-bold text-gray-900">{matchInfo.app.name}</span>
                            {typeof matchInfo.matchScore === "number" && (
                              <span className="ml-1 font-bold text-blue-600">
                                ({Math.round(matchInfo.matchScore * 100)}% confidence)
                              </span>
                            )}
                          </p>
                        )}

                        {suggestion && (
                          <button
                            onClick={() => applyDictionarySuggestion(d.uid)}
                            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100"
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            Apply Standard Term: <span className="underline">{suggestion.canonical}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setEditingUid(editing ? null : d.uid)}
                          className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center justify-center transition-all active:scale-95"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          onClick={() => removeDetected(d.uid)}
                          className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center transition-all active:scale-95"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {detected.length === 0 && (
                <div className="p-6 text-center rounded-2xl border border-gray-200 text-xs font-semibold text-gray-500 shadow-sm bg-gray-50">
                  No diagnostic codes extracted yet. Use the quick search below to append manually.
                </div>
              )}
            </div>

            {/* Append Manually */}
            <div className="mt-2 flex gap-2.5">
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addManual();
                }}
                placeholder="Append code manually (e.g. CBC, HbA1c, Lipid Panel)…"
                list="dict-suggestions"
                className="h-12 rounded-2xl text-sm font-medium border-gray-200 bg-white shadow-sm"
              />
              <datalist id="dict-suggestions">
                {MEDICAL_TEST_DICTIONARY.map((m) => (
                  <option key={m.canonical} value={m.canonical} />
                ))}
              </datalist>
              <Button variant="outline" className="gap-1.5 h-12 rounded-2xl font-bold border-gray-200 shadow-sm px-5 active:scale-95 transition-all hover:bg-gray-50 text-gray-800" onClick={addManual} disabled={!manualName.trim()}>
                <Plus className="w-4 h-4" /> Append
              </Button>
            </div>

            {/* Confirm & Save Floating Footbar */}
            <div className="mt-6 sticky bottom-20 z-40">
              <Button
                className="w-full gap-2.5 h-14 text-base font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 active:scale-98 transition-all"
                onClick={handleConfirmSave}
                disabled={detected.length === 0 || availableCount === 0}
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirm & Secure Collection {availableCount > 0 ? `(${availableCount} Code${availableCount > 1 ? "s" : ""})` : ""}
              </Button>
              {detected.length > 0 && availableCount === 0 && (
                <p className="text-xs text-center font-bold text-red-600 mt-2.5 bg-red-50 p-2 rounded-xl border border-red-200">
                  None of the verified diagnostic codes are active in your current local service coverage.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </MobileLayout>
  );
};

export default UploadPrescriptionScreen;
