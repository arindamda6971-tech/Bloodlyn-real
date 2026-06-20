import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  FileText,
  X,
  Sparkles,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShoppingCart,
  AlertTriangle,
  Pencil,
  Trash2,
  ZoomIn,
  ZoomOut,
  Wand2,
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
import { MEDICAL_TEST_DICTIONARY, matchToDictionary } from "@/lib/medical-dictionary";

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
  "Enhancing image quality…",
  "Reading handwriting with OCR…",
  "Matching with medical database…",
  "Verifying detected tests…",
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
    const id = setInterval(() => setStepIndex((i) => (i + 1) % PROCESSING_STEPS.length), 1400);
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
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      toast.error("Only JPG, PNG, or WebP images are accepted");
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
      // No persistent upload — keep image in memory only. The base64 cache
      // feeds the AI directly; nothing is written to the backend.
      toast.success("Prescription loaded");
    } catch (err) {
      console.error("Image compression error:", err);
      toast.error("Failed to process image. Please try again.");
    }
    // Reset the input so the same file can be re-selected
    event.target.value = "";
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
          toast.error("AI credits exhausted. Please top up Lovable AI credits to scan prescriptions.");
        } else if (status === 429) {
          toast.error("Too many scans right now. Please try again in a minute.");
        } else {
          toast.error(serverMsg || "Failed to analyze. Please try again.");
        }
        return;
      }

      const result = data as AIAnalysisResult;
      if (!result?.tests?.length) {
        toast.error(result?.notes || "No tests found. Try a clearer image.");
        setAnalysisNotes(result?.notes || "");
        return;
      }
      await ingestAiResult(result);
      // Ephemeral by design: ensure no analysis result is ever stored server-side.
      deletePrescription().catch(() => {});
      toast.success(`Detected ${result.tests.length} test${result.tests.length > 1 ? "s" : ""}. Please review.`);

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
    toast.success("Test added");
  };

  // ---------- Map verified tests → app catalog → cart ----------
  const isInCart = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const matchedAppTests = useMemo(() => {
    return detected.map((d) => {
      const q = d.name.toLowerCase();
      const found = appTests.find((a) => {
        const an = a.name.toLowerCase();
        if (an === q) return true;
        if (q.length > 3 && an.includes(q)) return true;
        if (an.length > 3 && q.includes(an)) return true;
        return false;
      });
      return { detected: d, app: found || null };
    });
  }, [detected, appTests]);

  const availableCount = matchedAppTests.filter((m) => m.app && !isInCart(m.app!.id)).length;

  const handleConfirmSave = () => {
    if (detected.length === 0) {
      toast.error("Add at least one test to confirm.");
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
    if (added > 0) toast.success(`${added} test${added > 1 ? "s" : ""} added to cart`);
    if (missing > 0) toast.message(`${missing} test${missing > 1 ? "s are" : " is"} not available in your locality`);
    if (added > 0) navigate("/cart");
  };

  // ---------- Render ----------
  if (isPrescriptionLoading) {
    return (
      <MobileLayout showNav={false} showFloatingAdd={false}>
        <div className="flex items-center justify-center h-screen">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showNav={false} showFloatingAdd={false}>
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Prescription Scanner</h1>
            <p className="text-xs text-muted-foreground">AI + medical dictionary verification</p>
          </div>
        </div>
      </motion.header>

      <div className="px-4 py-6 space-y-6 pb-32">
        {/* Upload Section */}
        {!uploadedImage && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Google Lens style viewfinder */}
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
              {/* Corner brackets */}
              {[
                "top-4 left-4 border-t-2 border-l-2 rounded-tl-xl",
                "top-4 right-4 border-t-2 border-r-2 rounded-tr-xl",
                "bottom-4 left-4 border-b-2 border-l-2 rounded-bl-xl",
                "bottom-4 right-4 border-b-2 border-r-2 rounded-br-xl",
              ].map((c) => (
                <div key={c} className={`absolute w-10 h-10 border-primary ${c}`} />
              ))}

              {/* Sweeping scan line */}
              <motion.div
                className="absolute inset-x-6 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_18px_2px_hsl(var(--primary))]"
                initial={{ top: "10%" }}
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                  className="w-16 h-16 rounded-2xl bg-primary/15 backdrop-blur-sm flex items-center justify-center mb-4 border border-primary/30"
                >
                  <FileText className="w-8 h-8 text-primary" />
                </motion.div>
                <h3 className="font-bold text-white text-lg">Scan your prescription</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-[240px]">
                  Align the paper inside the frame. Nothing is stored — your prescription is processed and discarded.
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button className="gap-2 h-12" onClick={() => cameraInputRef.current?.click()} disabled={isUploading}>
                <Camera className="w-4 h-4" /> Camera
              </Button>
              <Button variant="outline" className="gap-2 h-12" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <ImageIcon className="w-4 h-4" /> Gallery
              </Button>
            </div>

            <div className="soft-card p-4 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">For best accuracy</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Good, even lighting — no shadows</li>
                    <li>• Lay the prescription flat, fully in frame</li>
                    <li>• Avoid blur — tap focus before capturing</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}


        {/* Image preview with zoom */}
        {uploadedImage && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30">
              <div className="max-h-80 overflow-auto">
                <img
                  src={uploadedImage}
                  alt="Uploaded prescription"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s ease" }}
                  className="w-full object-contain select-none"
                  draggable={false}
                />
              </div>

              {/* Zoom controls */}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
                  className="w-9 h-9 rounded-full bg-background/90 border border-border shadow flex items-center justify-center"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                  className="w-9 h-9 rounded-full bg-background/90 border border-border shadow flex items-center justify-center"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleRemoveImage}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-destructive shadow-lg flex items-center justify-center"
                disabled={isUploading}
                aria-label="Remove image"
              >
                <X className="w-4 h-4 text-destructive-foreground" />
              </button>

              {(isUploading || isAnalyzing) && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner brackets */}
                  {[
                    "top-3 left-3 border-t-2 border-l-2 rounded-tl-lg",
                    "top-3 right-3 border-t-2 border-r-2 rounded-tr-lg",
                    "bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg",
                    "bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg",
                  ].map((c) => (
                    <div key={c} className={`absolute w-8 h-8 border-primary ${c}`} />
                  ))}
                  {/* Sweeping scan line */}
                  <motion.div
                    className="absolute inset-x-4 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_18px_2px_hsl(var(--primary))]"
                    initial={{ top: "8%" }}
                    animate={{ top: ["8%", "92%", "8%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="absolute inset-x-0 bottom-3 flex justify-center">
                    <span className="text-[11px] font-medium text-white bg-black/50 backdrop-blur px-2.5 py-1 rounded-full">
                      {isAnalyzing ? "Scanning…" : "Loading…"}
                    </span>
                  </div>
                </div>
              )}

            </div>

            {!analysisComplete && !isUploading && (
              <Button className="w-full gap-2 mt-4" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Scan with AI
                  </>
                )}
              </Button>
            )}
          </motion.div>
        )}

        {/* Processing pipeline */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="soft-card p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                    <Sparkles className="w-5 h-5 text-primary" />
                  </motion.div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">AI verification in progress</p>
                  <motion.p
                    key={stepIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-muted-foreground"
                  >
                    {PROCESSING_STEPS[stepIndex]}
                  </motion.p>
                </div>
              </div>
              <div className="space-y-2">
                {PROCESSING_STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis summary */}
        <AnimatePresence>
          {analysisComplete && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="soft-card p-4 border-success/30 bg-success/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground">Detected {detected.length} test{detected.length === 1 ? "" : "s"}</p>
                    {confidence && (
                      <Badge
                        variant={confidence === "high" ? "softSuccess" : confidence === "medium" ? "softWarning" : "softDestructive"}
                        className="text-xs"
                      >
                        {confidence} confidence
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Please verify, edit, or remove anything that looks wrong.
                  </p>
                  {analysisNotes && <p className="text-xs text-muted-foreground mt-1">{analysisNotes}</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification panel */}
        {(analysisComplete || detected.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-foreground">Detected Blood Tests</h2>
              <Badge variant="ai" className="text-xs">Verify before saving</Badge>
            </div>

            <div className="space-y-2">
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
                    className={`soft-card p-3 ${matchInfo?.app ? "" : "border-warning/30"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FlaskConical className="w-4 h-4 text-primary" />
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
                            className="h-9 text-sm"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingUid(d.uid)}
                            className="text-left w-full"
                          >
                            <h3 className="font-semibold text-foreground text-sm leading-snug">{d.name}</h3>
                          </button>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {d.source === "manual" ? (
                            <Badge variant="soft" className="text-[10px]">Manual</Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">OCR: "{d.originalAiName}"</span>
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
                              className="text-[10px]"
                            >
                              Match {Math.round(d.dictionaryHit.score * 100)}%
                            </Badge>
                          )}
                          {matchInfo?.app ? (
                            inCart ? (
                              <Badge variant="softSuccess" className="text-[10px]">
                                <ShoppingCart className="w-3 h-3 mr-1" /> In cart
                              </Badge>
                            ) : (
                              <Badge variant="softSuccess" className="text-[10px]">
                                Available · ₹{matchInfo.app.price}
                              </Badge>
                            )
                          ) : (
                            <Badge variant="softWarning" className="text-[10px]">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Not in your locality
                            </Badge>
                          )}
                        </div>

                        {suggestion && (
                          <button
                            onClick={() => applyDictionarySuggestion(d.uid)}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
                            <Wand2 className="w-3 h-3" />
                            Use suggestion: <span className="font-medium">{suggestion.canonical}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setEditingUid(editing ? null : d.uid)}
                          className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center"
                          aria-label="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5 text-foreground" />
                        </button>
                        <button
                          onClick={() => removeDetected(d.uid)}
                          className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {detected.length === 0 && (
                <div className="soft-card p-4 text-center text-sm text-muted-foreground">
                  No tests yet. Add one manually below.
                </div>
              )}
            </div>

            {/* Add manually */}
            <div className="mt-3 flex gap-2">
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addManual();
                }}
                placeholder="Add a test manually (e.g. CBC, HbA1c, Lipid Profile)…"
                list="dict-suggestions"
                className="h-10"
              />
              <datalist id="dict-suggestions">
                {MEDICAL_TEST_DICTIONARY.map((m) => (
                  <option key={m.canonical} value={m.canonical} />
                ))}
              </datalist>
              <Button variant="outline" className="gap-1" onClick={addManual} disabled={!manualName.trim()}>
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>

            {/* Confirm */}
            <div className="mt-4 sticky bottom-20 z-30">
              <Button
                className="w-full gap-2 h-12 text-base shadow-lg"
                onClick={handleConfirmSave}
                disabled={detected.length === 0 || availableCount === 0}
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirm & Save {availableCount > 0 ? `(${availableCount})` : ""}
              </Button>
              {detected.length > 0 && availableCount === 0 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  None of the verified tests are available in your locality yet.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </MobileLayout>
  );
};

export default UploadPrescriptionScreen;
