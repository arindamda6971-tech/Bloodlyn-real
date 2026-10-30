import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ServiceIllustration, type ServiceIllustrationName } from "./ServiceIllustrations";

interface Service {
  label: string;
  path: string;
  badge: string;
  price?: string;
  cta?: string;
  art: ServiceIllustrationName;
  /** Tile background and badge colours. */
  tint: string;
  badgeTone: string;
}

const SERVICES: Service[] = [
  { label: "Consult Doctor", path: "/doctor-consult", badge: "Live video", price: "From ₹299", art: "doctor",
    tint: "from-sky-100 via-sky-50 to-white", badgeTone: "text-sky-700" },
  { label: "ECG Test", path: "/ecg-test", badge: "At home", price: "From ₹499", art: "ecg",
    tint: "from-rose-100 via-rose-50 to-white", badgeTone: "text-rose-700" },
  { label: "BP Check", path: "/bp-check", badge: "Home visit", price: "From ₹199", art: "bp",
    tint: "from-indigo-100 via-indigo-50 to-white", badgeTone: "text-indigo-700" },
  { label: "Physiotherapy", path: "/physio-consult", badge: "Expert care", price: "From ₹599", art: "physio",
    tint: "from-teal-100 via-emerald-50 to-white", badgeTone: "text-teal-700" },
  { label: "Upload Prescription", path: "/upload-prescription", badge: "We'll call you to book", cta: "Upload", art: "prescription",
    tint: "from-amber-100 via-orange-50 to-white", badgeTone: "text-amber-700" },
];

/** Warm up a service screen's code as soon as a finger lands on its tile. */
const preload = (path: string) => {
  if (path === "/doctor-consult") import("../../pages/DoctorConsultScreen");
  else if (path === "/ecg-test") import("../../pages/ECGTestScreen");
  else if (path === "/bp-check") import("../../pages/BPCheckScreen");
};

/** Home "Our services": light tiles with a soft-3D illustration each; Upload Prescription spans both columns. */
const OurServices = memo(() => {
  const navigate = useNavigate();
  return (
    <section className="px-4 mt-8" style={{ contain: "content" }}>
      <h2 className="text-[19px] font-extrabold text-foreground tracking-tight mb-3">Our services</h2>
      <div className="grid grid-cols-2 gap-3">
        {SERVICES.map((s) => {
          const wide = !!s.cta;
          return (
            <button
              type="button"
              key={s.label}
              onClick={() => navigate(s.path)}
              onPointerDown={() => preload(s.path)}
              className={`home-render-section relative overflow-hidden isolate text-left rounded-2xl bg-gradient-to-br ${s.tint} ring-1 ring-black/[0.04] shadow-[0_6px_20px_-12px_rgba(15,23,42,0.25)] active:scale-[0.98] transition-transform duration-150 ${
                wide ? "col-span-2 h-[116px]" : "h-[168px]"
              }`}
            >
              <ServiceIllustration
                name={s.art}
                className={`absolute -z-10 pointer-events-none ${
                  wide ? "right-1 top-1/2 -translate-y-1/2 w-[108px] h-[108px]" : "-right-2 -bottom-2 w-[64%] max-w-[112px] h-auto aspect-square"
                }`}
              />
              <span className={`absolute inset-0 flex flex-col p-3.5 ${wide ? "justify-center pr-28" : ""}`}>
                <span className="min-w-0">
                  <span className={`inline-block text-[10px] font-bold ${s.badgeTone} bg-white/85 ring-1 ring-black/5 rounded-full px-2 py-0.5 mb-1.5`}>
                    {s.badge}
                  </span>
                  <span className="block text-[16px] font-extrabold text-slate-900 leading-tight">{s.label}</span>
                  {s.price && (
                    <span className="mt-1 flex items-center gap-0.5 text-[12.5px] font-semibold text-slate-600">
                      {s.price}
                      <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </span>
                  )}
                  {s.cta && (
                    <span className="mt-2 inline-flex items-center gap-0.5 text-[12.5px] font-bold text-white bg-slate-900 rounded-full pl-3.5 pr-2.5 py-1.5 shadow-md">
                      {s.cta}
                      <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
});

OurServices.displayName = "OurServices";

export default OurServices;
