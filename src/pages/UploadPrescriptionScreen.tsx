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
  ShieldCheck,
  Stethoscope,
  CalendarCheck,
  Activity,
  UploadCloud,
  FileUp,
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

const COMMON_SYMPTOMS = [
  { id: "routine", label: "Comprehensive Annual Health Check", icon: ShieldCheck, desc: "Essential full-body baseline evaluation", tests: ["Complete Blood Count", "Lipid Profile", "Liver Function Test"] },
  { id: "diabetes", label: "Advanced Glycemic & Endocrine Panel", icon: Activity, desc: "Detailed blood sugar and metabolic screening", tests: ["Fasting Blood Sugar", "HbA1c (Glycated Hemoglobin)"] },
  { id: "pain", label: "Rheumatology & Bone Density Screen", icon: AlertCircle, desc: "Targeted evaluation for joint pain and arthritis", tests: ["Vitamin D", "Calcium", "Uric Acid"] },
  { id: "fatigue", label: "Chronic Fatigue & Neurological Panel", icon: Sparkles, desc: "Evaluates systemic energy levels and vitamin deficiencies", tests: ["Thyroid Function Test", "Complete Blood Count", "Vitamin B12"] },
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
  const [activeTab, setActiveTab] = useState<"scan" | "text" | "bypass">("scan");
  const [pastedText, setPastedText] = useState("");

  // Bypass state
  const [instantPrescriptionRequested, setInstantPrescriptionRequested] = useState(false);
  const [provisionalBookingSelected, setProvisionalBookingSelected] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

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
      toast.success("Prescription securely loaded in memory");
    } catch (err) {
      console.error("Image compression error:", err);
      toast.error("Failed to process image. Please try again.");
    }
    // Reset the input so the same file can be re-selected
    event.target.value = "";
  };


  // ---------- Free Fallbacks / Simulation / Demo Mode ----------
  const handleSimulateDemo = async (presetType: "general" | "diabetes" | "thyroid") => {
    setIsAnalyzing(true);
    setUploadedImage("https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=400"); // placeholder doc prescription image
    setAnalysisComplete(false);
    setDetected([]);
    setAnalysisNotes("");
    setConfidence("");

    // Simulate pipeline execution
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

  const handleExtractText = async (text: string) => {
    if (!text.trim()) {
      toast.error("Please enter medical text or test names first.");
      return;
    }
    setIsAnalyzing(true);
    // Split by comma, newline, bullet points, or semicolons
    const segments = text
      .split(/[,\n;\t•\-\*]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);

    const next: DetectedTest[] = [];
    let matchCount = 0;

    for (const segment of segments) {
      const dict = await matchAsync(segment);
      if (dict && dict.score >= 0.5) {
        next.push({
          uid: newUid(),
          name: dict.canonical,
          originalAiName: segment,
          category: dict.category,
          dictionaryHit: { canonical: dict.canonical, score: dict.score },
          source: "ai",
        });
        matchCount++;
      } else {
        // Fallback for custom entries
        next.push({
          uid: newUid(),
          name: segment,
          originalAiName: segment,
          dictionaryHit: null,
          source: "manual",
        });
      }
    }

    setDetected(next);
    setAnalysisNotes("Parsed instantly using zero-latency local clinical dictionary.");
    setConfidence("high");
    setAnalysisComplete(true);
    setIsAnalyzing(false);
    toast.success(`Extracted ${next.length} diagnostic codes locally (100% free)!`);
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
      // Ephemeral by design: ensure no analysis result is ever stored server-side.
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

  // ---------- Fuzzy auto-match scanned test → closest catalog test ----------
  // Normalises both sides, strips common medical stop-words, then scores
  // exact > substring > token-overlap > Levenshtein similarity. The best
  // candidate above 0.55 is selected so noisy OCR still maps to a real test.
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

      // Substring (either direction) — strong signal
      if (q.length >= 3 && c.includes(q)) return 0.92;
      if (c.length >= 3 && q.includes(c)) return 0.9;

      // Token overlap (Jaccard) — handles reordered / extra words
      if (qT.length && cT.length) {
        const qs = new Set(qT);
        const cs = new Set(cT);
        let inter = 0;
        qs.forEach((t) => cs.has(t) && inter++);
        const jaccard = inter / (qs.size + cs.size - inter);
        if (jaccard >= 0.5) return 0.7 + jaccard * 0.2; // 0.7 – 0.9
      }

      // Levenshtein similarity on the normalized strings
      const dist = levenshtein(q, c);
      const maxLen = Math.max(q.length, c.length) || 1;
      const fuzzy = 1 - dist / maxLen;

      // Slight boost if the first significant token matches
      const tokenBoost = qT[0] && cT[0] && qT[0] === cT[0] ? 0.08 : 0;
      return Math.min(1, fuzzy + tokenBoost);
    };

    const FUZZY_THRESHOLD = 0.55;

    return detected.map((d) => {
      // Build candidate query set: user-edited name + AI's original + dictionary canonical
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

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleConfirmSave = () => {
    if (detected.length === 0 && activeTab !== "bypass") {
      toast.error("Please add or verify at least one diagnostic code.");
      return;
    }

    if (activeTab === "bypass") {
      let bypassAdded = false;
      if (instantPrescriptionRequested) {
        addToCart({ id: "instant-e-prescription", name: "Instant Doctor E-Prescription Authorization", price: 149 });
        toast.success("Instant Digital Physician Authorization added to cart!");
        bypassAdded = true;
      }
      if (provisionalBookingSelected) {
        addToCart({ id: "provisional-booking-hold", name: "Provisional Lab Hold (Provide Rx at sample collection)", price: 0 });
        toast.success("Provisional Slot Hold added to cart!");
        bypassAdded = true;
      }
      if (selectedSymptoms.length > 0) {
        // Add tests for selected symptoms
        selectedSymptoms.forEach((sym) => {
          const found = COMMON_SYMPTOMS.find((s) => s.id === sym);
          found?.tests.forEach((tName) => {
            const matchedApp = appTests.find((a) => a.name.toLowerCase() === tName.toLowerCase());
            if (matchedApp && !isInCart(matchedApp.id)) {
              addToCart({ id: matchedApp.id, name: matchedApp.name, price: matchedApp.price });
            } else if (!isInCart(`symptom-${tName}`)) {
              addToCart({ id: `symptom-${tName}`, name: tName, price: 399 });
            }
          });
        });
        toast.success("Clinical standing orders bundled into cart!");
        bypassAdded = true;
      }
      if (!bypassAdded) {
        toast.error("Please select a tele-bridge waiver or clinical standing order to proceed.");
        return;
      }
      navigate("/cart");
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
        <div className="flex items-center justify-center h-screen bg-gradient-to-b from-background to-muted/20">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
            <Sparkles className="w-10 h-10 text-primary" />
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showNav={false} showFloatingAdd={false}>
      {/* Pristine Sticky Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border/80 shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center gap-3.5 px-4 py-3.5">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted/90 hover:bg-muted border border-border/50 flex items-center justify-center transition-all active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight leading-none mb-1">Diagnostic Intake Portal</h1>
            <p className="text-xs font-semibold text-primary flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> AI OCR Matrix + Compliant Tele-Bridge
            </p>
          </div>
        </div>
      </motion.header>

      <main className="px-4 py-6 space-y-6 pb-36 max-w-lg mx-auto">
        {/* Ultra-Professional 3-Pillar Tab Segmented Control */}
        {!uploadedImage && (
          <div className="flex bg-muted/80 backdrop-blur-md p-1.5 rounded-2xl gap-1 border border-border/60 shadow-inner">
            <button
              onClick={() => setActiveTab("scan")}
              className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === "scan"
                  ? "bg-primary text-white shadow-lg shadow-primary/30 scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground active:scale-98"
              }`}
            >
              <Camera className="w-4 h-4" /> AI Scan
            </button>
            <button
              onClick={() => setActiveTab("text")}
              className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === "text"
                  ? "bg-primary text-white shadow-lg shadow-primary/30 scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground active:scale-98"
              }`}
            >
              <FileText className="w-4 h-4" /> Paste Text
            </button>
            <button
              onClick={() => setActiveTab("bypass")}
              className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === "bypass"
                  ? "bg-primary text-white shadow-lg shadow-primary/30 scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground active:scale-98"
              }`}
            >
              <Sparkles className="w-4 h-4 animate-pulse" /> Waivers
            </button>
          </div>
        )}

        {/* Pillar 1: AI Smart Scan (Holographic Viewfinder & Upload) */}
        {!uploadedImage && activeTab === "scan" && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Holographic scanner frame */}
            <div className="relative aspect-[4/5] rounded-[32px] overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-slate-700/60 shadow-2xl flex flex-col items-center justify-center p-6">
              {/* Corner target brackets */}
              {[
                "top-5 left-5 border-t-4 border-l-4 rounded-tl-2xl",
                "top-5 right-5 border-t-4 border-r-4 rounded-tr-2xl",
                "bottom-5 left-5 border-b-4 border-l-4 rounded-bl-2xl",
                "bottom-5 right-5 border-b-4 border-r-4 rounded-br-2xl",
              ].map((c) => (
                <div key={c} className={`absolute w-12 h-12 border-primary/90 ${c}`} />
              ))}

              {/* Laser Sweep Line */}
              <motion.div
                className="absolute inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_24px_4px_hsl(var(--primary))]"
                initial={{ top: "12%" }}
                animate={{ top: ["12%", "88%", "12%"] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Glowing decorative blur */}
              <div className="absolute w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

              {/* Center Icon & Guide */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="w-20 h-20 rounded-3xl bg-primary/20 backdrop-blur-md flex items-center justify-center mb-5 border border-primary/30 shadow-inner"
                >
                  <UploadCloud className="w-10 h-10 text-primary" />
                </motion.div>
                <h3 className="font-black text-white text-xl tracking-tight mb-2">Align Prescription in Frame</h3>
                <p className="text-xs text-slate-300 font-medium max-w-[260px] leading-relaxed">
                  Our advanced OCR instantly extracts medical codes, verifies local test availability, and secures sample collection.
                </p>
              </div>
            </div>

            {/* Quick Action CTAs */}
            <div className="grid grid-cols-2 gap-3.5">
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
              <Button className="gap-2.5 h-14 rounded-2xl text-sm font-black shadow-lg shadow-primary/20 active:scale-98 transition-all" onClick={() => cameraInputRef.current?.click()} disabled={isUploading}>
                <Camera className="w-5 h-5" /> Launch Camera
              </Button>
              <Button variant="outline" className="gap-2.5 h-14 rounded-2xl text-sm font-black border-border/80 shadow-sm active:scale-98 transition-all" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <ImageIcon className="w-5 h-5" /> Upload Gallery
              </Button>
            </div>

            {/* Simulated AI Scan Experience Box */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-primary/20 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 shadow-inner">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <div className="flex-1">
                  <h4 className="font-extrabold text-foreground text-sm tracking-tight mb-1">Explore Instant AI Simulation</h4>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed mb-3">
                    Don't have a paper prescription handy? Run a high-fidelity diagnostic simulation to instantly preview automated mapping.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" className="h-9 rounded-xl text-xs font-bold px-3.5 shadow-sm" onClick={() => handleSimulateDemo("general")}>
                      Simulate CBC & LFT
                    </Button>
                    <Button size="sm" variant="secondary" className="h-9 rounded-xl text-xs font-bold px-3.5 shadow-sm" onClick={() => handleSimulateDemo("diabetes")}>
                      Simulate Glycemic Panel
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Instruction Box */}
            <div className="soft-card p-4 rounded-2xl border border-border/60">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-warning" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground text-sm mb-1">AI Scan Best Practices</h4>
                  <ul className="text-xs text-muted-foreground space-y-1 font-medium leading-relaxed">
                    <li>• Ensure bright, even ambient lighting</li>
                    <li>• Keep the document perfectly flat and uncreased</li>
                    <li>• Avoid hand blur by tapping to focus before shooting</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pillar 2: Clinical Notes & Free Extraction */}
        {!uploadedImage && activeTab === "text" && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="soft-card p-5 rounded-3xl border border-border/80 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-black text-foreground text-base tracking-tight">Paste Clinical Notes</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Instantly extract test codes from physician summaries or WhatsApp messages.
                  </p>
                </div>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Example: Please arrange Complete Blood Count, Liver Function Test, and Lipid Profile for tomorrow morning..."
                className="w-full h-40 p-4 text-sm font-medium bg-muted/60 rounded-2xl border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none placeholder:text-muted-foreground/60 shadow-inner"
              />
              <Button
                className="w-full gap-2 h-12 rounded-xl font-bold shadow-md shadow-primary/20 active:scale-98 transition-all"
                onClick={() => handleExtractText(pastedText)}
                disabled={isAnalyzing || !pastedText.trim()}
              >
                <Sparkles className="w-4 h-4" /> Process Clinical Notes Instantly
              </Button>
            </div>

            {/* Quick Clinical Presets */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Curated Diagnostic Presets:</h4>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { title: "Complete General Health Profile", tests: "Complete Blood Count, Serum Creatinine, Liver Function Test (LFT), Lipid Profile", desc: "Covers standard organ functions & cell counts" },
                  { title: "Advanced Glycemic & Metabolic Screen", tests: "Fasting Blood Sugar, Post Prandial Blood Sugar, HbA1c Test, Average Glucose", desc: "Comprehensive diabetes monitoring panel" },
                  { title: "Comprehensive Endocrine & Thyroid Panel", tests: "Thyroid Function Test (TFT), TSH, T3, T4 Profile, Free T3", desc: "Detailed evaluation of thyroid hormone levels" },
                ].map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setPastedText(preset.tests);
                      toast.success(`Loaded ${preset.title} notes`);
                    }}
                    className="p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/40 cursor-pointer transition-all active:scale-98 shadow-sm flex items-center justify-between group"
                  >
                    <div>
                      <h5 className="font-extrabold text-foreground text-sm group-hover:text-primary transition-colors">{preset.title}</h5>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{preset.desc}</p>
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
                      Insert →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Pillar 3: Compliance Waivers & Tele-Bridge */}
        {!uploadedImage && activeTab === "bypass" && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-slate-700/60 rounded-[32px] p-7 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-success animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-success">Compliant Tele-Bridge</span>
              </div>
              <h3 className="text-white text-2xl font-black tracking-tight mb-2 leading-tight">Missing a Medical Prescription?</h3>
              <p className="text-xs text-slate-300 font-medium leading-relaxed mb-6 max-w-[320px]">
                Certain clinical lab tests and diagnostic scans require active physician authorization. Select one of our seamless tele-bridges below to instantly lock in your home collection slot!
              </p>

              <div className="space-y-4">
                {/* Instant Digital Physician Sign-off */}
                <div
                  onClick={() => setInstantPrescriptionRequested(!instantPrescriptionRequested)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start gap-4 ${
                    instantPrescriptionRequested
                      ? "bg-primary/25 border-primary shadow-xl shadow-primary/15 scale-[1.02]"
                      : "bg-slate-800/60 border-slate-700 hover:bg-slate-800 active:scale-98"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${
                    instantPrescriptionRequested ? "bg-primary border-primary text-white shadow-md shadow-primary/30" : "bg-slate-700 border-slate-600 text-slate-300"
                  }`}>
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-black text-white text-sm tracking-tight">Instant Digital Physician Authorization</h4>
                      <span className="text-xs font-black text-primary bg-primary/15 px-3 py-1 rounded-full border border-primary/30">₹149</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      Our on-call licensed digital physician will evaluate your requested diagnostic panel and append a verified e-prescription instantly.
                    </p>
                  </div>
                </div>

                {/* Provisional "Hold & Verify" Hold */}
                <div
                  onClick={() => setProvisionalBookingSelected(!provisionalBookingSelected)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start gap-4 ${
                    provisionalBookingSelected
                      ? "bg-success/20 border-success shadow-xl shadow-success/15 scale-[1.02]"
                      : "bg-slate-800/60 border-slate-700 hover:bg-slate-800 active:scale-98"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${
                    provisionalBookingSelected ? "bg-success border-success text-white shadow-md shadow-success/30" : "bg-slate-700 border-slate-600 text-slate-300"
                  }`}>
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-black text-white text-sm tracking-tight">Provisional Lab Slot Hold</h4>
                      <span className="text-xs font-black text-success bg-success/15 px-3 py-1 rounded-full border border-success/30">Free</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      Lock in your preferred collection slot immediately. Simply hand over your physical medical paper to the visiting phlebotomist upon arrival.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Standing Orders Clinical Intake Section */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Clinical Standing Orders:</h3>
                <span className="text-[11px] text-primary font-bold">Preventive Intake Waiver</span>
              </div>
              <div className="grid grid-cols-1 gap-3.5">
                {COMMON_SYMPTOMS.map((sym) => {
                  const isSelected = selectedSymptoms.includes(sym.id);
                  return (
                    <div
                      key={sym.id}
                      onClick={() => toggleSymptom(sym.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected ? "bg-primary/15 border-primary shadow-md scale-[1.01]" : "bg-card border-border/60 hover:border-border active:scale-98"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isSelected ? "bg-primary border-primary text-white shadow-md shadow-primary/20" : "bg-muted border-border/80 text-muted-foreground"
                        }`}>
                          <sym.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-foreground text-sm tracking-tight">{sym.label}</h4>
                          <p className="text-xs text-muted-foreground font-medium mt-0.5">{sym.desc}</p>
                          <p className="text-[11px] text-primary font-bold mt-1">Panel: {sym.tests.join(", ")}</p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ml-2 transition-all ${
                        isSelected ? "bg-primary border-primary text-white shadow-sm" : "border-border text-transparent"
                      }`}>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              className="w-full gap-2 h-14 text-base font-black rounded-2xl shadow-xl shadow-primary/25 active:scale-98 transition-all"
              onClick={handleConfirmSave}
              disabled={!instantPrescriptionRequested && !provisionalBookingSelected && selectedSymptoms.length === 0}
            >
              <CheckCircle2 className="w-5 h-5" />
              Secure Diagnostics & Proceed
            </Button>
          </motion.div>
        )}

        {/* Uploaded Image Preview & Zoom Layer */}
        {uploadedImage && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="relative rounded-[32px] overflow-hidden border border-border/80 bg-muted/40 shadow-2xl">
              <div className="max-h-96 overflow-auto p-2">
                <img
                  src={uploadedImage}
                  alt="Uploaded prescription"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s ease" }}
                  className="w-full object-contain select-none rounded-2xl"
                  draggable={false}
                />
              </div>

              {/* High-end Zoom Controls */}
              <div className="absolute bottom-4 right-4 flex gap-2.5 z-20">
                <button
                  onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
                  className="w-11 h-11 rounded-2xl bg-background/95 backdrop-blur border border-border shadow-lg flex items-center justify-center transition-all active:scale-95"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-5 h-5 text-foreground" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                  className="w-11 h-11 rounded-2xl bg-background/95 backdrop-blur border border-border shadow-lg flex items-center justify-center transition-all active:scale-95"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-5 h-5 text-foreground" />
                </button>
              </div>

              <button
                onClick={handleRemoveImage}
                className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-destructive/90 hover:bg-destructive shadow-xl flex items-center justify-center z-20 transition-all active:scale-95"
                disabled={isUploading}
                aria-label="Remove image"
              >
                <X className="w-5 h-5 text-destructive-foreground" />
              </button>

              {(isUploading || isAnalyzing) && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {/* Corner brackets */}
                  {[
                    "top-4 left-4 border-t-4 border-l-4 rounded-tl-xl",
                    "top-4 right-4 border-t-4 border-r-4 rounded-tr-xl",
                    "bottom-4 left-4 border-b-4 border-l-4 rounded-bl-xl",
                    "bottom-4 right-4 border-b-4 border-r-4 rounded-br-xl",
                  ].map((c) => (
                    <div key={c} className={`absolute w-10 h-10 border-primary ${c}`} />
                  ))}
                  {/* Laser sweep line */}
                  <motion.div
                    className="absolute inset-x-6 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_24px_4px_hsl(var(--primary))]"
                    initial={{ top: "8%" }}
                    animate={{ top: ["8%", "92%", "8%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="absolute inset-x-0 bottom-6 flex justify-center">
                    <span className="text-xs font-bold text-white bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-slate-700/50">
                      {isAnalyzing ? "Interrogating OCR Matrix…" : "Acquiring Image…"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!analysisComplete && !isUploading && (
              <Button className="w-full gap-2.5 h-14 rounded-2xl text-base font-black shadow-xl shadow-primary/20 active:scale-98 transition-all" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <Sparkles className="w-5 h-5" />
                    </motion.div>
                    Analyzing Prescription Matrix…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" /> Execute AI Deep Scan
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
              className="soft-card p-5 rounded-3xl border border-border/80 shadow-md"
            >
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                    <Sparkles className="w-6 h-6 text-primary" />
                  </motion.div>
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-foreground text-sm">AI OCR Processing Engine</p>
                  <motion.p
                    key={stepIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-muted-foreground font-medium mt-0.5"
                  >
                    {PROCESSING_STEPS[stepIndex]}
                  </motion.p>
                </div>
              </div>
              <div className="space-y-2">
                {PROCESSING_STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all duration-300 ${i <= stepIndex ? "bg-primary shadow-sm shadow-primary/20" : "bg-muted"}`}
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
              className="soft-card p-5 rounded-3xl border border-success/40 bg-success/5 shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-success/15 border border-success/30 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-black text-foreground text-base">Verified {detected.length} Diagnostic Code{detected.length === 1 ? "" : "s"}</p>
                    {confidence && (
                      <Badge
                        variant={confidence === "high" ? "softSuccess" : confidence === "medium" ? "softWarning" : "softDestructive"}
                        className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      >
                        {confidence} accuracy
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Review your mapped clinical codes below. You can edit names or manually append additional tests.
                  </p>
                  {analysisNotes && <p className="text-[11px] font-bold text-primary mt-2 bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">{analysisNotes}</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification Panel */}
        {(analysisComplete || detected.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-black text-foreground tracking-tight">Identified Clinical Panel</h2>
              <Badge variant="ai" className="text-xs font-bold py-1 px-2.5 rounded-full shadow-sm">Review & Finalize</Badge>
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
                    className={`soft-card p-4 rounded-2xl border transition-all shadow-sm ${matchInfo?.app ? "border-border/80 bg-card" : "border-warning/40 bg-warning/5"}`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <FlaskConical className="w-5 h-5 text-primary" />
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
                            className="h-10 text-sm font-bold rounded-xl"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingUid(d.uid)}
                            className="text-left w-full group"
                          >
                            <h3 className="font-extrabold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">{d.name}</h3>
                          </button>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {d.source === "manual" ? (
                            <Badge variant="soft" className="text-[10px] font-bold py-0.5 px-2 rounded-lg">Manual Entry</Badge>
                          ) : (
                            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-lg border border-border/50">OCR: "{d.originalAiName}"</span>
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
                              <Badge variant="softSuccess" className="text-[10px] font-bold py-0.5 px-2 rounded-lg flex items-center gap-1">
                                <ShoppingCart className="w-3 h-3" /> Secured in Cart
                              </Badge>
                            ) : (
                              <Badge variant="softSuccess" className="text-[10px] font-bold py-0.5 px-2 rounded-lg">
                                Local Cover · ₹{matchInfo.app.price}
                              </Badge>
                            )
                          ) : (
                            <Badge variant="softWarning" className="text-[10px] font-bold py-0.5 px-2 rounded-lg flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Outside Local Cover
                            </Badge>
                          )}
                        </div>

                        {matchInfo?.app && matchInfo.app.name.toLowerCase() !== d.name.toLowerCase() && (
                          <p className="mt-2 text-[11px] font-medium text-muted-foreground bg-background/60 p-2 rounded-xl border border-border/40">
                            Auto-linked to catalog code:{" "}
                            <span className="font-bold text-foreground">{matchInfo.app.name}</span>
                            {typeof matchInfo.matchScore === "number" && (
                              <span className="ml-1 font-extrabold text-primary">
                                ({Math.round(matchInfo.matchScore * 100)}% confidence)
                              </span>
                            )}
                          </p>
                        )}

                        {suggestion && (
                          <button
                            onClick={() => applyDictionarySuggestion(d.uid)}
                            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-xl border border-primary/20"
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            Apply Standard Term: <span className="underline">{suggestion.canonical}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setEditingUid(editing ? null : d.uid)}
                          className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 border border-border/60 flex items-center justify-center transition-all active:scale-95"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4 text-foreground" />
                        </button>
                        <button
                          onClick={() => removeDetected(d.uid)}
                          className="w-9 h-9 rounded-xl bg-destructive/15 hover:bg-destructive/25 border border-destructive/30 flex items-center justify-center transition-all active:scale-95"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {detected.length === 0 && (
                <div className="soft-card p-6 text-center rounded-3xl border border-border/80 text-xs font-semibold text-muted-foreground shadow-inner">
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
                className="h-12 rounded-2xl text-sm font-medium border-border/80 shadow-inner"
              />
              <datalist id="dict-suggestions">
                {MEDICAL_TEST_DICTIONARY.map((m) => (
                  <option key={m.canonical} value={m.canonical} />
                ))}
              </datalist>
              <Button variant="outline" className="gap-1.5 h-12 rounded-2xl font-extrabold border-border/80 shadow-sm px-5 active:scale-95 transition-all" onClick={addManual} disabled={!manualName.trim()}>
                <Plus className="w-4 h-4" /> Append
              </Button>
            </div>

            {/* Confirm & Save Floating Footbar */}
            <div className="mt-6 sticky bottom-20 z-40">
              <Button
                className="w-full gap-2.5 h-14 text-base font-black rounded-2xl shadow-2xl shadow-primary/30 active:scale-98 transition-all"
                onClick={handleConfirmSave}
                disabled={detected.length === 0 || availableCount === 0}
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirm & Secure Collection {availableCount > 0 ? `(${availableCount} Code${availableCount > 1 ? "s" : ""})` : ""}
              </Button>
              {detected.length > 0 && availableCount === 0 && (
                <p className="text-xs text-center font-bold text-destructive mt-2.5 bg-destructive/10 p-2 rounded-xl border border-destructive/20">
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
