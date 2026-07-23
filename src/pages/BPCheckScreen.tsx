import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, HeartPulse, Info, AlertTriangle, CheckCircle2, AlertOctagon, ArrowRight, Activity } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Input } from "@/components/ui/input";

type BPStep = "KNOWLEDGE_CHECK" | "EDUCATION" | "INPUT_DATA" | "RESULTS";

type BPCategory = "NORMAL" | "ELEVATED" | "STAGE_1" | "STAGE_2" | "CRISIS";

interface BPData {
  sys: string;
  dia: string;
  hr: string;
}

const getBPCategory = (sys: number, dia: number): BPCategory => {
  if (sys > 180 || dia > 120) return "CRISIS";
  if (sys >= 140 || dia >= 90) return "STAGE_2";
  if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return "STAGE_1";
  if (sys >= 120 && sys <= 129 && dia < 80) return "ELEVATED";
  return "NORMAL";
};

const getCategoryInfo = (category: BPCategory) => {
  switch (category) {
    case "NORMAL":
      return {
        label: "Normal",
        color: "text-emerald-500",
        bgColor: "bg-emerald-500",
        bgLight: "bg-emerald-50",
        icon: <CheckCircle2 className="w-12 h-12 text-emerald-500" />,
        message: "Your blood pressure is in a healthy range. Keep up the good work with a balanced diet and regular exercise!",
      };
    case "ELEVATED":
      return {
        label: "Elevated",
        color: "text-yellow-500",
        bgColor: "bg-yellow-500",
        bgLight: "bg-yellow-50",
        icon: <Info className="w-12 h-12 text-yellow-500" />,
        message: "Your blood pressure is slightly elevated. Consider adopting healthier lifestyle habits like reducing sodium intake and staying active.",
      };
    case "STAGE_1":
      return {
        label: "Hypertension Stage 1",
        color: "text-orange-500",
        bgColor: "bg-orange-500",
        bgLight: "bg-orange-50",
        icon: <AlertTriangle className="w-12 h-12 text-orange-500" />,
        message: "Your blood pressure is high. It is recommended to consult a doctor for a proper evaluation and lifestyle plan.",
      };
    case "STAGE_2":
      return {
        label: "Hypertension Stage 2",
        color: "text-rose-500",
        bgColor: "bg-rose-500",
        bgLight: "bg-rose-50",
        icon: <AlertTriangle className="w-12 h-12 text-rose-500" />,
        message: "Your blood pressure is very high. Please consult a healthcare provider promptly for medical advice and treatment.",
      };
    case "CRISIS":
      return {
        label: "Hypertensive Crisis",
        color: "text-red-600",
        bgColor: "bg-red-600",
        bgLight: "bg-red-50",
        icon: <AlertOctagon className="w-12 h-12 text-red-600 animate-pulse" />,
        message: "Seek emergency medical attention immediately. Do not wait to see if your pressure comes down on its own.",
      };
  }
};

const BPCheckScreen = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<BPStep>("KNOWLEDGE_CHECK");
  const [bpData, setBpData] = useState<BPData>({ sys: "", dia: "", hr: "" });
  const [category, setCategory] = useState<BPCategory>("NORMAL");

  const handleBack = () => {
    if (step === "KNOWLEDGE_CHECK") {
      navigate(-1);
    } else if (step === "EDUCATION") {
      setStep("KNOWLEDGE_CHECK");
    } else if (step === "INPUT_DATA") {
      setStep("KNOWLEDGE_CHECK");
    } else if (step === "RESULTS") {
      setStep("INPUT_DATA");
    }
  };

  const handleCalculate = () => {
    const sysNum = parseInt(bpData.sys);
    const diaNum = parseInt(bpData.dia);
    if (!sysNum || !diaNum || sysNum <= 0 || diaNum <= 0) return;
    setCategory(getBPCategory(sysNum, diaNum));
    setStep("RESULTS");
  };

  const isFormValid = bpData.sys.length > 1 && bpData.dia.length > 1;

  return (
    <MobileLayout showNav={false}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-[17px] font-black text-foreground tracking-tight">Instant BP Check</h1>
            <p className="text-[11px] font-semibold text-muted-foreground">Self-Assessment Tool</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-hidden relative min-h-[calc(100vh-80px)]">
        <AnimatePresence mode="wait">
          {step === "KNOWLEDGE_CHECK" && (
            <motion.div
              key="knowledge"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 h-full flex flex-col justify-center mt-12"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-xl shadow-rose-500/20 mb-8 mx-auto">
                <HeartPulse className="w-10 h-10 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-center mb-3 text-foreground tracking-tight">
                Do you know your<br />blood pressure?
              </h2>
              <p className="text-sm text-center text-muted-foreground font-medium mb-10">
                You need a recent reading from a digital monitor or clinic to use this tool.
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => setStep("INPUT_DATA")}
                  className="w-full bg-foreground text-background py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-black/5"
                >
                  Yes, I have my reading
                </button>
                <button
                  onClick={() => setStep("EDUCATION")}
                  className="w-full bg-muted text-foreground py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform"
                >
                  No, I don't know it
                </button>
              </div>
            </motion.div>
          )}

          {step === "EDUCATION" && (
            <motion.div
              key="education"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 mt-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
                <Info className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black mb-4 text-foreground tracking-tight">
                How to measure BP
              </h2>
              
              <div className="bg-muted/50 border border-border/50 rounded-2xl p-5 mb-6">
                <p className="text-[13px] font-medium text-foreground leading-relaxed mb-4">
                  <span className="font-bold text-rose-500">Important:</span> Blood pressure cannot be measured using a smartphone screen or camera.
                </p>
                <ul className="space-y-3 text-[13px] text-muted-foreground font-medium">
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center shrink-0 border border-border mt-0.5">1</div>
                    Visit a nearby clinic, pharmacy, or diagnostic center.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center shrink-0 border border-border mt-0.5">2</div>
                    Or use an FDA-approved home digital BP monitor.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center shrink-0 border border-border mt-0.5">3</div>
                    Rest for 5 minutes before taking the measurement.
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate("/doctor-consult")}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  Book Clinic Visit <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleBack}
                  className="w-full bg-transparent text-foreground py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          )}

          {step === "INPUT_DATA" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 mt-4"
            >
              <h2 className="text-2xl font-black mb-2 text-foreground tracking-tight">
                Enter your reading
              </h2>
              <p className="text-sm text-muted-foreground font-medium mb-8">
                Input your Systolic and Diastolic numbers.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1 mb-2 block">Systolic (Top)</label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="120"
                        value={bpData.sys}
                        onChange={(e) => setBpData({ ...bpData, sys: e.target.value.slice(0, 3) })}
                        className="h-16 text-2xl font-black pl-4 pr-16 bg-muted/50 border-border/50 rounded-2xl focus-visible:ring-rose-500"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">mmHg</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1 mb-2 block">Diastolic (Bottom)</label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="80"
                        value={bpData.dia}
                        onChange={(e) => setBpData({ ...bpData, dia: e.target.value.slice(0, 3) })}
                        className="h-16 text-2xl font-black pl-4 pr-16 bg-muted/50 border-border/50 rounded-2xl focus-visible:ring-rose-500"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">mmHg</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1 mb-2 flex items-center gap-1.5">
                    Heart Rate <span className="text-muted-foreground/50 lowercase">(optional)</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="72"
                      value={bpData.hr}
                      onChange={(e) => setBpData({ ...bpData, hr: e.target.value.slice(0, 3) })}
                      className="h-16 text-xl font-bold pl-12 pr-16 bg-muted/50 border-border/50 rounded-2xl focus-visible:ring-rose-500"
                    />
                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">BPM</span>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <button
                  onClick={handleCalculate}
                  disabled={!isFormValid}
                  className={`w-full py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                    isFormValid 
                      ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-pink-500/25" 
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  Analyze Reading
                </button>
              </div>
            </motion.div>
          )}

          {step === "RESULTS" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 h-full flex flex-col mt-4"
            >
              {(() => {
                const info = getCategoryInfo(category);
                return (
                  <>
                    <div className="text-center mb-8 pt-4">
                      <div className="flex justify-center mb-4">
                        <div className={`w-24 h-24 rounded-full ${info.bgLight} flex items-center justify-center shadow-inner`}>
                          {info.icon}
                        </div>
                      </div>
                      <h2 className="text-3xl font-black text-foreground tracking-tight mb-1">
                        {bpData.sys} / {bpData.dia}
                      </h2>
                      {bpData.hr && (
                        <p className="text-sm font-bold text-muted-foreground mt-1">
                          Heart Rate: {bpData.hr} BPM
                        </p>
                      )}
                      <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-muted mb-4 mt-3">
                        <span className={`text-[13px] font-black uppercase tracking-widest ${info.color}`}>
                          {info.label}
                        </span>
                      </div>
                      <p className="text-[14px] text-muted-foreground font-medium px-4 leading-relaxed">
                        {info.message}
                      </p>
                    </div>

                    <div className="bg-muted/30 border border-border/50 rounded-3xl p-5 mb-auto">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">What to do next</h3>
                      <div className="space-y-3">
                        {category === "NORMAL" ? (
                          <button onClick={() => { setStep("INPUT_DATA"); setBpData({sys: "", dia: "", hr: ""}); }} className="w-full bg-white border border-border/50 text-foreground py-3.5 rounded-2xl font-bold text-[13px] shadow-sm flex justify-between items-center px-4">
                            Log another reading <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </button>
                        ) : category === "CRISIS" ? (
                          <>
                            <button className="w-full bg-red-600 text-white py-3.5 rounded-2xl font-bold text-[13px] shadow-lg shadow-red-600/20 flex justify-between items-center px-4">
                              Call Emergency Services <ArrowRight className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => navigate("/doctor-consult")} className="w-full bg-foreground text-background py-3.5 rounded-2xl font-bold text-[13px] shadow-lg flex justify-between items-center px-4 active:scale-[0.98]">
                              Consult a Doctor <ArrowRight className="w-4 h-4" />
                            </button>
                            <button onClick={() => navigate("/categories")} className="w-full bg-white border border-border/50 text-foreground py-3.5 rounded-2xl font-bold text-[13px] shadow-sm flex justify-between items-center px-4 active:scale-[0.98]">
                              Book a full checkup <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 mb-6">
                      <div className="flex gap-3">
                        <Info className="w-5 h-5 text-blue-500 shrink-0" />
                        <p className="text-[10px] text-blue-900/70 font-medium leading-relaxed">
                          <span className="font-bold text-blue-900">Medical Disclaimer:</span> This tool provides general health information only and is not a medical diagnosis. Always consult a qualified healthcare professional for medical advice.
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileLayout>
  );
};

export default BPCheckScreen;
