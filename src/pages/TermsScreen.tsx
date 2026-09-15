import { motion } from "framer-motion";
import { ChevronRight, ArrowLeft } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { POLICY_CATEGORIES } from "@/lib/policies";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

const TermsScreen = () => {
  useSEO({ title: "Privacy & Terms | BloodLyn", description: "Legal and policy information for BloodLyn." });
  const navigate = useNavigate();

  return (
    <MobileLayout className="bg-slate-50 min-h-screen pb-6">
      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-6 shadow-sm sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Privacy & Terms</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Policies, terms and important information</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {POLICY_CATEGORIES.map((category) => (
          <section key={category.id} className="space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase ml-2">
              {category.title}
            </h2>
            
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              {category.policies.map((policy, idx, arr) => (
                <button
                  key={policy.id}
                  onClick={() => navigate(`/policy/${policy.id}`)}
                  className={`w-full flex items-center p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left ${idx !== arr.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 mr-4">
                    <policy.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{policy.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium line-clamp-1">{policy.subtitle}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          </section>
        ))}

        <div className="text-center pt-4 pb-8">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Need help understanding our policies?</h3>
          <p className="text-xs text-slate-500 font-medium mb-3">Reach out to our compliance and support team anytime.</p>
          <button 
            onClick={() => navigate("/support")}
            className="text-xs font-bold text-blue-600 active:scale-95 transition-transform"
          >
            Contact Support
          </button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default TermsScreen;
