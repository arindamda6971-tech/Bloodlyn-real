const TakeChargeBanner = () => {
  return (
    <div className="px-4 mt-4">
      <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <img 
          src="/hero-banner.webp" 
          alt="Take Charge of Your Health" 
          className="w-full h-auto object-cover"
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
