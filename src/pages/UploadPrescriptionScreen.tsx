import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Image,
  FileText,
  X,
  Sparkles,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import MobileLayout from "@/components/layout/MobileLayout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePrescriptionStorage } from "@/hooks/usePrescriptionStorage";
import { useCart } from "@/contexts/CartContext";
import { useBridgeTests } from "@/hooks/useBridgeTests";

interface AIAnalysisResult {
  tests: Array<{
    name: string;
    shortName?: string;
    category?: string;
  }>;
  confidence: string;
  notes?: string;
}

interface MatchedTest {
  id: string;
  name: string;
  price: number;
  matched: boolean; // true = available in app, false = not available
  originalAiName: string;
}

const UploadPrescriptionScreen = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { addToCart, items } = useCart();
  const { data: bridgeData } = useBridgeTests();

  const { prescription, isLoading: isPrescriptionLoading, savePrescription, updateAnalysisResult, deletePrescription } = usePrescriptionStorage();

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [matchedTests, setMatchedTests] = useState<MatchedTest[]>([]);
  const [analysisNotes, setAnalysisNotes] = useState<string>("");
  const [confidence, setConfidence] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [imageBase64Cache, setImageBase64Cache] = useState<string>("");
  const [appTests, setAppTests] = useState<Array<{ id: string; name: string; price: number }>>([]);
  // Confirmation step: user must explicitly confirm which detected tests to add
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState(false);

  // Load available tests from Supabase + bridge
  useEffect(() => {
    const fetchAppTests = async () => {
      const { data } = await supabase
        .from("tests")
        .select("id, name, price")
        .eq("is_active", true);
      const localTests = (data || []).map((t) => ({ id: t.id, name: t.name, price: Number(t.price) }));

      // Also include bridge tests
      const bridgeTests = (bridgeData?.tests || []).map((t) => ({
        id: t.id,
        name: t.test_name,
        price: t.price > 0 ? t.price : t.collection_fee || 0,
      }));

      // Merge both, dedup by name
      const combined = [...localTests];
      const existingNames = new Set(combined.map((t) => t.name.toLowerCase()));
      bridgeTests.forEach((bt) => {
        if (!existingNames.has(bt.name.toLowerCase())) {
          combined.push(bt);
          existingNames.add(bt.name.toLowerCase());
        }
      });
      setAppTests(combined);
    };
    fetchAppTests();
  }, [bridgeData]);

  // Load saved prescription on mount
  useEffect(() => {
    if (prescription && !isPrescriptionLoading) {
      setUploadedImage(prescription.image_url);
      if (prescription.analysis_result) {
        const result = prescription.analysis_result as AIAnalysisResult;
        if (result.tests && result.tests.length > 0) {
          matchAITestsToApp(result.tests);
          setAnalysisNotes(result.notes || "");
          setConfidence(result.confidence);
          setAnalysisComplete(true);
        }
      }
    }
  }, [prescription, isPrescriptionLoading, appTests, matchAITestsToApp]);

  const matchAITestsToApp = useCallback((aiTests: AIAnalysisResult["tests"]) => {
    const matched: MatchedTest[] = aiTests.map((aiTest) => {
      const aiName = aiTest.name.toLowerCase();
      const aiShort = (aiTest.shortName || "").toLowerCase();

      // Better fuzzy matching logic
      const found = appTests.find((at) => {
        const appName = at.name.toLowerCase();
        // Exact match
        if (appName === aiName) return true;
        // Contains match (at least 4 chars to avoid false positives like 'Ca')
        if (aiName.length > 3 && appName.includes(aiName)) return true;
        if (appName.length > 3 && aiName.includes(appName)) return true;
        // Abbreviation match
        if (aiShort && (appName === aiShort || appName.includes(aiShort))) return true;
        return false;
      });

      return {
        id: found?.id || `unavailable-${aiTest.name}-${Math.random()}`,
        name: found?.name || aiTest.name,
        price: found?.price || 0,
        matched: !!found,
        originalAiName: aiTest.name,
      };
    });

    setMatchedTests(matched);
    // Pre-select all available tests so user can review then confirm
    setSelectedTestIds(new Set(matched.filter((t) => t.matched).map((t) => t.id)));
    setConfirmed(false);
  }, [appTests]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size should be less than 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        setImageBase64Cache(base64Image);
        setUploadedImage(base64Image);
        setAnalysisComplete(false);
        setMatchedTests([]);
        setAnalysisNotes("");
        setConfidence("");
        setIsUploading(true);
        const savedUrl = await savePrescription(base64Image);
        if (savedUrl) {
          setUploadedImage(savedUrl);
          toast.success("Prescription uploaded successfully!");
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzePrescription = async () => {
    // Must have a base64 image for analysis — URLs won't work with the AI
    if (!imageBase64Cache) {
      toast.error("Please re-upload the prescription image to analyze it.");
      return;
    }
    setIsAnalyzing(true);

    try {
      const imageBase64 = imageBase64Cache;

      const { data, error } = await supabase.functions.invoke('analyze-prescription', {
        body: { imageBase64 }
      });

      if (error) {
        console.error("Error analyzing prescription:", error);
        toast.error("Failed to analyze prescription. Please try again.");
        setIsAnalyzing(false);
        return;
      }

      const result = data as AIAnalysisResult;

      if (!result.tests || result.tests.length === 0) {
        toast.error(result.notes || "No tests found in the prescription. Please upload a clearer image.");
        setAnalysisNotes(result.notes || "");
        setIsAnalyzing(false);
        return;
      }

      matchAITestsToApp(result.tests);
      setAnalysisNotes(result.notes || "");
      setConfidence(result.confidence);
      setAnalysisComplete(true);
      await updateAnalysisResult(result);

      const availableCount = result.tests.filter((t) => {
        const aiName = t.name.toLowerCase();
        const aiShort = (t.shortName || "").toLowerCase();
        return appTests.some((at) => {
          const appName = at.name.toLowerCase();
          return appName === aiName || appName.includes(aiName) || aiName.includes(appName) || (aiShort && (appName.includes(aiShort) || aiShort.includes(appName)));
        });
      }).length;

      toast.success(`Found ${result.tests.length} tests — ${availableCount} available in your area`);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to analyze prescription. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveImage = async () => {
    await deletePrescription();
    setUploadedImage(null);
    setAnalysisComplete(false);
    setMatchedTests([]);
    setSelectedTestIds(new Set());
    setConfirmed(false);
  };

  const isInCart = (testId: string) => items.some((item) => item.id === testId);

  const toggleTestSelection = (testId: string) => {
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  const handleConfirmAddToCart = () => {
    const toAdd = matchedTests.filter(
      (t) => t.matched && selectedTestIds.has(t.id) && !isInCart(t.id)
    );
    if (toAdd.length === 0) {
      toast.error("Select tests to add.");
      return;
    }
    let added = 0;
    for (const test of toAdd) {
      const success = addToCart({ id: test.id, name: test.name, price: test.price });
      if (success) added++;
    }
    if (added > 0) {
      setConfirmed(true);
    }
  };

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

  const availableTests = matchedTests.filter((t) => t.matched);
  const unavailableTests = matchedTests.filter((t) => !t.matched);

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
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Upload Prescription</h1>
            <p className="text-xs text-muted-foreground">Get AI-powered test recommendations</p>
          </div>
        </div>
      </motion.header>

      <div className="px-4 py-6 space-y-6 pb-32">
        {/* Upload Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {!uploadedImage ? (
            <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center bg-muted/30">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Upload your prescription</h3>
              <p className="text-sm text-muted-foreground mb-6">Take a photo or upload an image of your prescription</p>
              <div className="flex gap-3 justify-center">
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                <Button variant="outline" className="gap-2" onClick={() => cameraInputRef.current?.click()} disabled={isUploading}>
                  <Camera className="w-4 h-4" /> Camera
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <Image className="w-4 h-4" /> Gallery
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="w-full rounded-2xl overflow-hidden border border-border bg-muted/20">
                <img 
                  src={uploadedImage} 
                  alt="Uploaded prescription" 
                  className="w-full rounded-2xl object-contain max-h-80"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />

                <div className="hidden items-center justify-center h-48 text-muted-foreground flex-col gap-2">
                  <FileText className="w-12 h-12" />
                  <p className="text-sm font-medium">Prescription uploaded</p>
                  <p className="text-xs">Image preview unavailable</p>
                </div>
              </div>
              {isUploading && (
                <div className="absolute inset-0 bg-background/80 rounded-2xl flex items-center justify-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Sparkles className="w-8 h-8 text-primary" />
                  </motion.div>
                  <span className="ml-2 text-sm text-muted-foreground">Uploading...</span>
                </div>
              )}
              <button onClick={handleRemoveImage} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-destructive shadow-lg flex items-center justify-center" disabled={isUploading}>
                <X className="w-4 h-4 text-destructive-foreground" />
              </button>
              {!analysisComplete && !isUploading && (
                <div className="mt-4">
                  <Button className="w-full gap-2" onClick={handleAnalyzePrescription} disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                          <Sparkles className="w-4 h-4" />
                        </motion.div>
                        Analyzing with AI...
                      </>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Analyze Prescription</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Analysis Status */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="soft-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                    <Sparkles className="w-5 h-5 text-primary" />
                  </motion.div>
                </div>
                <div>
                  <p className="font-medium text-foreground">AI is analyzing your prescription</p>
                  <p className="text-sm text-muted-foreground">This may take a few seconds...</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Complete */}
        <AnimatePresence>
          {analysisComplete && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="soft-card p-4 border-success/30 bg-success/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">Analysis Complete</p>
                    {confidence && (
                      <Badge variant={confidence === "high" ? "softSuccess" : confidence === "medium" ? "softWarning" : "softDestructive"} className="text-xs">
                        {confidence} confidence
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {availableTests.length} available • {unavailableTests.length} not available
                  </p>
                  {analysisNotes && <p className="text-xs text-muted-foreground mt-1">{analysisNotes}</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Available Tests — Confirmation step */}
        <AnimatePresence>
          {availableTests.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-foreground">Review Detected Tests</h2>
                <Badge variant="ai" className="text-xs">AI Detected</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Tick the tests you want and tap <span className="font-semibold text-foreground">Confirm</span> to add them to your cart.
              </p>
              <div className="space-y-2">
                {availableTests.map((test, index) => {
                  const alreadyInCart = isInCart(test.id);
                  const isSelected = selectedTestIds.has(test.id);
                  return (
                    <motion.label
                      key={test.id}
                      htmlFor={`presc-test-${test.id}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.08 }}
                      className={`soft-card p-3 flex items-center gap-3 cursor-pointer ${
                        alreadyInCart ? "opacity-70" : ""
                      } ${isSelected && !alreadyInCart ? "ring-2 ring-primary/40" : ""}`}
                    >
                      <Checkbox
                        id={`presc-test-${test.id}`}
                        checked={alreadyInCart || isSelected}
                        disabled={alreadyInCart}
                        onCheckedChange={() => toggleTestSelection(test.id)}
                      />
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FlaskConical className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm">{test.name}</h3>
                        {test.price > 0 && (
                          <p className="text-xs text-primary font-bold mt-0.5">₹{test.price}</p>
                        )}
                      </div>
                      {alreadyInCart && (
                        <Badge variant="softSuccess" className="text-[10px] flex-shrink-0">
                          <ShoppingCart className="w-3 h-3 mr-1" /> In cart
                        </Badge>
                      )}
                    </motion.label>
                  );
                })}
              </div>

              {/* Confirm CTA */}
              {(() => {
                const selectableCount = availableTests.filter(
                  (t) => selectedTestIds.has(t.id) && !isInCart(t.id)
                ).length;
                return (
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Button
                      className="flex-1 gap-2"
                      onClick={handleConfirmAddToCart}
                      disabled={selectableCount === 0}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Add {selectableCount > 0 ? `${selectableCount} ` : ""}to Cart
                    </Button>
                    {confirmed && (
                      <Button variant="outline" className="gap-2" onClick={() => navigate("/cart")}>
                        <ShoppingCart className="w-4 h-4" /> Go to Cart
                      </Button>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>


        {/* Unavailable Tests */}
        <AnimatePresence>
          {unavailableTests.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h2 className="text-sm font-semibold text-muted-foreground">Not Available in Your Locality</h2>
              </div>
              <div className="space-y-2">
                {unavailableTests.map((test, index) => (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="soft-card p-3 opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <FlaskConical className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-muted-foreground text-sm">{test.originalAiName}</h3>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">Currently unavailable</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips Section */}
        {!uploadedImage && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="soft-card p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-warning" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Tips for best results</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Ensure good lighting when taking a photo</li>
                  <li>• Keep the prescription flat and fully visible</li>
                  <li>• Make sure text is clear and readable</li>
                  <li>• Avoid blurry or cropped images</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>


    </MobileLayout>
  );
};

export default UploadPrescriptionScreen;
