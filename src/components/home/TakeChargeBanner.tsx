const TakeChargeBanner = () => {
  return (
    <div className="px-4 mt-4">
      <div className="relative w-full rounded-[20px] overflow-hidden shadow-sm border border-blue-50/50 bg-slate-50">
        <img 
          src="/hero-banner.webp" 
          alt="Take Charge of Your Health" 
          className="w-full h-auto object-cover"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          style={{ 
            imageRendering: '-webkit-optimize-contrast',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
        />
      </div>
    </div>
  );
};

export default TakeChargeBanner;
