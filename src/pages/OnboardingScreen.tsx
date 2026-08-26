import { useNavigate } from "react-router-dom";

const OnboardingScreen = () => {
  const navigate = useNavigate();

  const handleNext = () => {
    try { localStorage.setItem("bloodlyn-onboarded", "1"); } catch { /* ignore */ }
    navigate("/login");
  };

  return (
    <div className="h-[100dvh] w-full md:max-w-[430px] mx-auto flex flex-col relative overflow-hidden bg-white">
      <div
        className="flex-1 bg-white overflow-y-auto overscroll-y-none min-h-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="px-7 pt-16 pb-8 flex flex-col items-center h-full justify-center">

          {/* Main Logo */}
          <div className="flex justify-center mb-6 mt-12">
            <img src="/assets/images/logo-full.png" alt="BloodLyn" className="h-24 w-auto object-contain" />
          </div>

          {/* ── Text ── */}
          <div className="mt-8">
            <p className="text-[13px] text-gray-400 font-medium mb-1 text-center">Welcome to BloodLyn</p>
            <h2 className="text-[22px] font-extrabold text-gray-900 text-center mb-3">
              Your Health, Our Priority
            </h2>
            <p className="text-[14px] text-gray-400 text-center leading-relaxed mb-8 max-w-[300px] mx-auto">
              Book lab tests, consult doctors, and get healthcare services at your doorstep.
            </p>
          </div>

          {/* ── Get Started Button ── */}
          <div className="w-full mt-auto pt-8">
            <button
              onClick={handleNext}
              className="w-full h-[52px] rounded-full text-white font-bold text-[16px] shadow-lg transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(90deg, #4338ca 0%, #c084fc 100%)' }}
            >
              Get Started
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
