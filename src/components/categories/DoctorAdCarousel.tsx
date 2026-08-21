import { useNavigate } from "react-router-dom";
import { ChevronRight, ShieldCheck } from "lucide-react";

interface Props {
  categories?: { name: string; slug: string; tests: number }[];
}

const DoctorAdCarousel = ({ categories }: Props) => {
  const navigate = useNavigate();

  return (
    <div
      className="relative w-full rounded-[24px] overflow-hidden cursor-pointer group shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100"
      onClick={() => navigate("/categories")}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600" />
      {/* Background Graphic or Image */}
      <img
        src="https://images.unsplash.com/photo-1582719478250-c894e4dc929e?auto=format&fit=crop&q=80&w=800"
        alt="Featured"
        className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 group-hover:scale-105 transition-transform duration-700"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/80 to-transparent" />
      
      <div className="relative p-5 md:p-6 flex flex-col justify-between h-[190px]">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              NABL Certified Labs
            </span>
          </div>
          <h3 className="text-[22px] font-black text-white leading-tight drop-shadow-md">
            Comprehensive<br />Health Packages
          </h3>
          <p className="text-indigo-100 text-[12px] font-semibold mt-2 max-w-[200px] leading-snug">
            Get a complete overview of your health with our expert-curated profiles.
          </p>
        </div>
        
        <div className="flex items-center mt-3">
          <span className="bg-white/20 backdrop-blur-md text-white text-[12px] font-bold px-4 py-2 rounded-full flex items-center gap-1.5 group-hover:bg-white/30 transition-colors border border-white/20 shadow-sm">
            Explore Now <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default DoctorAdCarousel;
