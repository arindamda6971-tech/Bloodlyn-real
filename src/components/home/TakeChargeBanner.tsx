import { useNavigate } from "react-router-dom";

const TakeChargeBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 mt-4">
      <div 
        onClick={() => navigate("/categories")}
        className="relative w-full rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)] cursor-pointer active:scale-[0.98] transition-transform duration-150"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate("/categories");
          }
        }}
        aria-label="Book a Test - Explore Tests"
      >
        <img 
          src="/hero-banner.webp" 
          alt="Take Charge of Your Health" 
          className="w-full h-auto object-cover pointer-events-none select-none"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          style={{ 
            imageRendering: '-webkit-optimize-contrast',
          }}
        />
      </div>
    </div>
  );
};

export default TakeChargeBanner;
