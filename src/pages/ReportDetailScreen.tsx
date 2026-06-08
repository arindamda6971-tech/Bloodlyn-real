import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Download,
  Share2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { toast } from "sonner";

const reportDetails = {
  name: "Complete Blood Count (CBC)",
  date: "November 28, 2024",
   labName: "BloodLyn Labs",
  parameters: [
    { name: "Hemoglobin", value: 14.2, unit: "g/dL", min: 13.0, max: 17.0, status: "normal" },
    { name: "RBC Count", value: 5.1, unit: "million/μL", min: 4.5, max: 5.5, status: "normal" },
    { name: "WBC Count", value: 7200, unit: "/μL", min: 4000, max: 11000, status: "normal" },
    { name: "Platelet Count", value: 250000, unit: "/μL", min: 150000, max: 400000, status: "normal" },
    { name: "PCV/Hematocrit", value: 42, unit: "%", min: 38, max: 50, status: "normal" },
    { name: "MCV", value: 88, unit: "fL", min: 80, max: 100, status: "normal" },
    { name: "MCH", value: 28, unit: "pg", min: 27, max: 32, status: "normal" },
    { name: "MCHC", value: 33, unit: "g/dL", min: 32, max: 36, status: "normal" },
    { name: "RDW", value: 13.5, unit: "%", min: 11.5, max: 14.5, status: "normal" },
  ],
  aiSummary: "Your CBC results are within normal ranges. Your hemoglobin and RBC levels indicate good oxygen-carrying capacity. White blood cell count is healthy, suggesting your immune system is functioning well. Platelet count is optimal for proper blood clotting.",
  recommendations: [
    "Maintain a balanced diet rich in iron and vitamins",
    "Stay hydrated with 8-10 glasses of water daily",
    "Continue regular exercise for cardiovascular health",
    "Schedule your next checkup in 6 months",
  ],
};

const ReportDetailScreen = () => {
  const navigate = useNavigate();
  const [showAiSummary, setShowAiSummary] = useState(true);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "text-success";
      case "low":
        return "text-warning";
      case "high":
        return "text-destructive";
      default:
        return "text-foreground";
    }
  };

  const getProgress = (value: number, min: number, max: number) => {
    const range = max - min;
    const position = ((value - min) / range) * 100;
    return Math.max(0, Math.min(100, position));
  };

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader
        title="Report Details"
        rightAction={
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Download className="w-5 h-5" />
            </Button>
          </div>
        }
      />

      <div className="px-4 pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <h1 className="text-xl font-bold text-foreground">{reportDetails.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {reportDetails.date} • {reportDetails.labName}
          </p>
          <div className="flex gap-2 mt-3">
            <Badge variant="softSuccess">All Normal</Badge>
            <Badge variant="soft">{reportDetails.parameters.length} Parameters</Badge>
          </div>
        </motion.div>

        {/* AI Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6"
        >
          <button
            onClick={() => setShowAiSummary(!showAiSummary)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-success/10 border border-primary/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-success flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">AI Report Summary</p>
                   <p className="text-xs text-muted-foreground">Powered by BloodLyn AI</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showAiSummary ? "rotate-180" : ""}`} />
            </div>
          </button>

          {showAiSummary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="soft-card mt-2"
            >
              <p className="text-foreground text-sm leading-relaxed">
                {reportDetails.aiSummary}
              </p>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="font-semibold text-foreground text-sm mb-2">Recommendations:</p>
                <ul className="space-y-2">
                  {reportDetails.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Parameters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <h2 className="text-lg font-bold text-foreground mb-4">Test Parameters</h2>
          <div className="space-y-3">
            {reportDetails.parameters.map((param, index) => (
              <motion.div
                key={param.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="soft-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-sm">{param.name}</p>
                    <button>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <Badge variant={param.status === "normal" ? "softSuccess" : "softWarning"}>
                    {param.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <p className={`text-lg font-bold ${getStatusColor(param.status)}`}>
                    {param.value.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{param.unit}</span>
                  </p>
                </div>

                {/* Progress bar */}
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-success rounded-full"
                    style={{ width: `${getProgress(param.value, param.min, param.max)}%` }}
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rounded-full" style={{ left: `calc(${getProgress(param.value, param.min, param.max)}% - 4px)` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{param.min}</span>
                  <span className="text-xs text-muted-foreground">{param.max}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 space-y-3"
        >
          <Button variant="hero" className="w-full" size="lg" onClick={() => navigate("/doctor-consult")}>
            <MessageCircle className="w-5 h-5" />
            Consult a Doctor
          </Button>
          <Button variant="outline" className="w-full" size="lg" onClick={() => {
            toast.success("Downloading PDF...");
            setTimeout(() => {
              toast.error("Demo mode: No actual PDF file attached to this mock report.");
            }, 1000);
          }}>
            <Download className="w-5 h-5" />
            Download PDF Report
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default ReportDetailScreen;
