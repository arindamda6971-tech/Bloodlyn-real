import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { getPolicyById } from "@/lib/policies";
import { appPageFor } from "@/lib/app-content";
import { useAppContent } from "@/hooks/useAppContent";
import { AppPageText } from "@/components/AppContentText";
import { useSEO } from "@/hooks/useSEO";
import NotFound from "./NotFound";

const updatedOn = (iso: string | null) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

const PolicyDetailScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: content, isLoading } = useAppContent();

  const policy = id ? getPolicyById(id) : undefined;
  // The team's version from Admin replaces the built-in text; Admin-only pages have no built-in one.
  const fromAdmin = id ? appPageFor(content, id) : undefined;
  const title = fromAdmin?.title || policy?.title;

  useSEO({
    title: title ? `${title} | BloodLyn` : "Policy Not Found",
    description: policy?.subtitle ?? "",
  });

  if (!policy && !fromAdmin) {
    // An Admin-only page is known once the content arrives.
    if (isLoading) return <MobileLayout className="bg-white min-h-screen" showNav={false}>{null}</MobileLayout>;
    return <NotFound />;
  }

  const Icon = policy?.icon ?? FileText;
  const lastUpdated = fromAdmin ? updatedOn(fromAdmin.updated_at) : policy?.lastUpdated;

  return (
    <MobileLayout className="bg-white min-h-screen pb-10" showNav={false}>
      {/* Sticky Header */}
      <div className="bg-white px-4 pt-0 pb-4 shadow-sm border-b border-slate-100 sticky top-0 z-20 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-700 active:scale-95 transition-transform shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 pr-4">
          <h1 className="text-lg font-bold text-slate-900 truncate">{title}</h1>
        </div>
      </div>

      <div className="px-5 py-6">
        <div className="mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">{title}</h1>
          {lastUpdated && (
            <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mb-1">Last Updated: {lastUpdated}</p>
          )}
        </div>

        {fromAdmin ? (
          <AppPageText text={fromAdmin.content} />
        ) : (
          <div className="prose prose-sm prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600">{policy?.content}</div>
        )}
      </div>
    </MobileLayout>
  );
};

export default PolicyDetailScreen;
