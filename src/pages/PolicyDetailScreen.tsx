import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { getPolicyById } from "@/lib/policies";
import { useSEO } from "@/hooks/useSEO";
import NotFound from "./NotFound";

const PolicyDetailScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const policy = id ? getPolicyById(id) : undefined;
  
  useSEO({ 
    title: policy ? `${policy.title} | BloodLyn` : "Policy Not Found", 
    description: policy ? policy.subtitle : "" 
  });

  if (!policy) {
    return <NotFound />;
  }

  return (
    <MobileLayout className="bg-white min-h-screen pb-10" showNav={false}>
      {/* Sticky Header */}
      <div className="bg-white px-4 pt-0 pb-4 shadow-sm border-b border-slate-100 sticky top-0 z-20 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-700 active:scale-95 transition-transform shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 pr-4">
          <h1 className="text-lg font-bold text-slate-900 truncate">{policy.title}</h1>
        </div>
      </div>

      <div className="px-5 py-6">
        <div className="mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <policy.icon className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">{policy.title}</h1>
          <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mb-1">
            Last Updated: {policy.lastUpdated}
          </p>
        </div>

        <div className="prose prose-sm prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600">
          {policy.content}
        </div>
      </div>
    </MobileLayout>
  );
};

export default PolicyDetailScreen;
