import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, Droplet, Phone, X, MessageCircle, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { getAuthErrorMessage, checkRateLimit, recordAuthAttempt, resetRateLimit } from "@/utils/errorMessages";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { sanitizeInternationalPhone } from "@/utils/inputSanitizers";

const emailSchema = z.string().trim().email("Please enter a valid email");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const phoneSchema = z.string().regex(/^\+?[1-9]\d{9,14}$/, "Please enter a valid phone number");

const getPasswordStrength = (pass: string) => {
  if (pass.length === 0) return { label: "", color: "", textClass: "", bars: 0 };
  let score = 0;
  if (pass.length > 5) score += 1;
  if (pass.length > 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
  if (score === 2 && /[^A-Za-z0-9]/.test(pass)) score += 1;
  if (score <= 1) return { label: "Weak", color: "bg-red-500", textClass: "text-red-500", bars: 1 };
  if (score === 2) return { label: "Medium", color: "bg-yellow-500", textClass: "text-yellow-500", bars: 2 };
  return { label: "Strong", color: "bg-green-500", textClass: "text-green-500", bars: 3 };
};

const LoginScreen = () => {
  useSEO({ title: "Sign in to BloodLyn", description: "Sign in to BloodLyn to book home diagnostic tests and access your health reports." });
  const navigate = useNavigate();
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const strength = getPasswordStrength(password);

  const location = useLocation();
  useEffect(() => {
    if (user) {
      const rawFrom = (location.state as { from?: string | { pathname?: string } } | null)?.from;
      const fromPath = typeof rawFrom === "string" ? rawFrom : rawFrom?.pathname;
      let locationChecked = false;
      try { locationChecked = localStorage.getItem(`location_checked_${user.id}`) === "true"; } catch { /* ignore */ }
      const destination = fromPath && fromPath !== "/login"
        ? fromPath
        : locationChecked ? "/home" : "/location-check";
        
      if (location.pathname !== destination) {
        navigate(destination, { replace: true });
      }
    }
  }, [user, navigate, location.pathname, location.state]);

  const handleEmailAuth = async () => {
    try {
      const rateLimitCheck = checkRateLimit();
      if (rateLimitCheck.blocked) {
        toast({ title: "Too Many Attempts", description: `Please wait ${Math.ceil(rateLimitCheck.remainingSeconds / 60)} minute(s) before trying again.`, variant: "destructive" });
        return;
      }
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        toast({ title: "Invalid Email", description: emailResult.error.errors[0].message, variant: "destructive" });
        return;
      }
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        toast({ title: "Invalid Password", description: passwordResult.error.errors[0].message, variant: "destructive" });
        return;
      }
      if (isSignUp) {
        const phoneResult = phoneSchema.safeParse(phoneNumber);
        if (!phoneResult.success) {
          toast({ title: "Invalid Phone", description: phoneResult.error.errors[0].message, variant: "destructive" });
          return;
        }
        if (password !== confirmPassword) {
          toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
          return;
        }
        if (!fullName.trim()) {
          toast({ title: "Name Required", description: "Please enter your full name.", variant: "destructive" });
          return;
        }
      }
      setIsLoading(true);
      const attemptResult = recordAuthAttempt();
      if (attemptResult.blocked) {
        toast({ title: "Too Many Attempts", description: `Please wait ${Math.ceil(attemptResult.remainingSeconds / 60)} minute(s) before trying again.`, variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (isSignUp) {
        const { error } = await signUpWithEmail(email, password, fullName, phoneNumber);
        if (error) {
          const msg = (error as Error).message?.toLowerCase() || '';
          if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
            const { error: signInErr } = await signInWithEmail(email, password);
            if (signInErr) {
              toast({ title: "Account Exists", description: "This email is already registered. Please sign in or reset your password.", variant: "destructive" });
              setIsSignUp(false);
            } else {
              resetRateLimit();
              toast({ title: "Welcome back!", description: "Signed in to your existing account." });
            }
          } else {
            toast({ title: "Sign Up Failed", description: getAuthErrorMessage(error), variant: "destructive" });
          }
        } else {
          resetRateLimit();
          const { error: signInErr } = await signInWithEmail(email, password);
          if (signInErr) {
            toast({ title: "Check Your Email", description: "We've sent you a confirmation link. Verify your email, then sign in." });
            setIsSignUp(false);
          } else {
            toast({ title: "Account Created", description: "Welcome to BloodLyn!" });
          }
        }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          toast({ title: "Sign In Failed", description: "Invalid email or password. Please try again.", variant: "destructive" });
        } else {
          resetRateLimit();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const rateLimitCheck = checkRateLimit();
    if (rateLimitCheck.blocked) {
      toast({ title: "Too Many Attempts", description: `Please wait ${Math.ceil(rateLimitCheck.remainingSeconds / 60)} minute(s) before trying again.`, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const attemptResult = recordAuthAttempt();
    if (attemptResult.blocked) {
      toast({ title: "Too Many Attempts", description: `Please wait ${Math.ceil(attemptResult.remainingSeconds / 60)} minute(s) before trying again.`, variant: "destructive" });
      setIsLoading(false);
      return;
    }
    const { error } = await signInWithGoogle();
    if (error) {
      toast({ title: "Google Sign In Failed", description: getAuthErrorMessage(error), variant: "destructive" });
      setIsLoading(false);
    } else {
      resetRateLimit();
    }
  };

  return (
    <div className="h-[100dvh] w-full md:max-w-[430px] mx-auto relative overflow-y-auto bg-white" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Headset icon - top right */}
      <button
        onClick={() => setShowHelp(true)}
        className="absolute top-[calc(var(--sat,0px)+6px)] right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Help and support"
      >
        <Headset className="w-5 h-5 text-gray-700" />
      </button>


      {/* ── HELP & SUPPORT BOTTOM SHEET ── */}
      <AnimatePresence>
        {showHelp && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            {/* Sheet */}
            <motion.div
              initial={false}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
            >
              <div className="bg-white rounded-t-[1.5rem] w-full md:max-w-[430px] px-6 pt-5 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
                {/* Handle bar */}
                <div className="flex justify-center mb-4">
                  <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[18px] font-bold text-gray-900">Help & Support</h3>
                  <button onClick={() => setShowHelp(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                {/* Options */}
                <div className="space-y-3">
                  <a
                    href="tel:+919883143033"
                    className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-gray-900">Call Us</p>
                      <p className="text-[13px] text-gray-500">+91 98831 43033</p>
                    </div>
                  </a>
                  <a
                    href="https://wa.me/919883143033"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-2xl bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-gray-900">WhatsApp</p>
                      <p className="text-[13px] text-gray-500">+91 98831 43033</p>
                    </div>
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <div className="px-7 pt-[calc(var(--sat,0px)+52px)] pb-[40vh] flex flex-col">

          {/* Main Logo */}
          <div className="flex justify-center mb-5">
            <img src="/assets/images/logo-full.png" alt="BloodLyn" className="h-14 w-auto object-contain" />
          </div>


          {/* Title */}
          <h2 className="text-[20px] font-extrabold text-gray-900 text-center tracking-tight">
            {isSignUp ? "Create your account" : "Log in to your account"}
          </h2>
          <p className="text-[12px] text-gray-400 text-center mt-1 mb-6">
            {isSignUp ? "Let's get you started with BloodLyn." : "Welcome back! Please enter your details."}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? 'signup' : 'login'}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* ════════ LOGIN MODE ════════ */}
              {!isSignUp && (
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 ml-1">Email Address</label>
                    <Input
                      type="email"
                      placeholder="nicholas@ergemlia.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-[52px] rounded-2xl border border-gray-100 bg-gray-50 px-4 text-[15px] placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#4338ca]/20 focus-visible:border-[#4338ca] transition-all"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 ml-1">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEmailAuth(); } }}
                        className="h-[52px] rounded-2xl border border-gray-100 bg-gray-50 px-4 pr-12 text-[15px] placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#4338ca]/20 focus-visible:border-[#4338ca] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                  </div>

                  {/* Forgot */}
                  <div className="text-right">
                    <button
                      onClick={async () => {
                        const emailResult = emailSchema.safeParse(email);
                        if (!emailResult.success) { toast({ title: "Enter Email", description: "Please enter your email address first", variant: "destructive" }); return; }
                        setIsLoading(true);
                        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
                        setIsLoading(false);
                        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
                        else { toast({ title: "Check Your Email", description: "Password reset link sent to your email." }); }
                      }}
                      className="text-[13px] font-semibold text-[#4338ca] hover:text-[#3730a3] transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>

                  {/* Log In Button */}
                  <div className="pt-2">
                    <Button
                      onClick={handleEmailAuth}
                      className="w-full h-[46px] rounded-full text-white font-bold text-[15px] shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                      style={{ background: 'linear-gradient(90deg, #4338ca 0%, #c084fc 100%)' }}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Or continue with</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Social buttons */}
                  <div>
                    <button
                      onClick={handleGoogleAuth}
                      disabled={isLoading}
                      className="w-full h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span className="text-[13px] font-bold text-gray-700">Continue with Google</span>
                    </button>
                  </div>


                  {/* Switch to signup */}
                  <div className="text-center pt-2">
                    <button onClick={() => setIsSignUp(true)} className="text-[13px] text-gray-500">
                      Don't have an account?{" "}
                      <span className="font-bold text-[#4338ca] underline underline-offset-2">Sign up</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ════════ SIGN UP MODE ════════ */}
              {isSignUp && (
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 ml-1">Full Name</label>
                    <Input
                      type="text"
                      placeholder="Nicholas Ergemlia"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-[52px] rounded-2xl border border-gray-100 bg-gray-50 px-4 text-[15px] placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#4338ca]/20 focus-visible:border-[#4338ca] transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 ml-1">Email Address</label>
                    <Input
                      type="email"
                      placeholder="nicholas@ergemlia.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-[52px] rounded-2xl border border-gray-100 bg-gray-50 px-4 text-[15px] placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#4338ca]/20 focus-visible:border-[#4338ca] transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 ml-1">Phone Number</label>
                    <Input
                      type="tel"
                      inputMode="tel"
                      maxLength={15}
                      placeholder="+91 98765 43210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(sanitizeInternationalPhone(e.target.value))}
                      className="h-[52px] rounded-2xl border border-gray-100 bg-gray-50 px-4 text-[15px] placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#4338ca]/20 focus-visible:border-[#4338ca] transition-all"
                    />
                  </div>

                  {/* Password with strength */}
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 ml-1">Password</label>
                    <div className="relative">
                      <Input
                        type="password"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-[52px] rounded-2xl border border-gray-100 bg-gray-50 px-4 pr-32 text-[15px] placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#4338ca]/20 focus-visible:border-[#4338ca] transition-all"
                      />
                      {password.length > 0 && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <div className="flex gap-[3px]">
                            <div className={`w-3 h-1.5 rounded-full ${strength.bars >= 1 ? strength.color : 'bg-gray-200'}`} />
                            <div className={`w-3 h-1.5 rounded-full ${strength.bars >= 2 ? strength.color : 'bg-gray-200'}`} />
                            <div className={`w-3 h-1.5 rounded-full ${strength.bars >= 3 ? strength.color : 'bg-gray-200'}`} />
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${strength.textClass}`}>{strength.label}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 ml-1">Confirm Password</label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEmailAuth(); } }}
                        className="h-[52px] rounded-2xl border border-gray-100 bg-gray-50 px-4 pr-12 text-[15px] placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#4338ca]/20 focus-visible:border-[#4338ca] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                  </div>

                  {/* Create Account Button */}
                  {/* Sign Up Button */}
                  <div className="pt-3">
                    <Button
                      onClick={handleEmailAuth}
                      className="w-full h-[46px] rounded-full text-white font-bold text-[15px] shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                      style={{ background: 'linear-gradient(90deg, #4338ca 0%, #c084fc 100%)' }}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                    </Button>
                  </div>

                  {/* Switch to login */}
                  <div className="text-center pt-1 pb-2">
                    <button onClick={() => setIsSignUp(false)} className="text-[13px] text-gray-500">
                      Already have an account?{" "}
                      <span className="font-bold text-[#4338ca] underline underline-offset-2">Log in</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
      </div>
    </div>
  );
};

export default LoginScreen;
