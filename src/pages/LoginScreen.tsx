import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Zap, Phone, Mail, Lock, Eye, EyeOff, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const LoginScreen = () => {
  useSEO({ title: "Sign in to BloodLyn", description: "Sign in to BloodLyn to book home diagnostic tests and access your health reports." });
  const navigate = useNavigate();
  const { user, signInWithEmail, signUpWithEmail, signInWithPhone, verifyOtp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  
  // Form fields
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Redirect if already logged in — respect `state.from` so users return to where they started
  const location = useLocation();
  useEffect(() => {
    if (user) {
      const destination = (location.state as any)?.from?.pathname || "/home";
      navigate(destination, { replace: true });
    }
  }, [user, navigate, location]);

  const handleEmailAuth = async () => {
    try {
      // Check rate limiting first
      const rateLimitCheck = checkRateLimit();
      if (rateLimitCheck.blocked) {
        toast({ 
          title: "Too Many Attempts", 
          description: `Please wait ${Math.ceil(rateLimitCheck.remainingSeconds / 60)} minute(s) before trying again.`,
          variant: "destructive" 
        });
        return;
      }

      // Validate inputs
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

      setIsLoading(true);
      
      // Record attempt for rate limiting
      const attemptResult = recordAuthAttempt();
      if (attemptResult.blocked) {
        toast({ 
          title: "Too Many Attempts", 
          description: `Please wait ${Math.ceil(attemptResult.remainingSeconds / 60)} minute(s) before trying again.`,
          variant: "destructive" 
        });
        setIsLoading(false);
        return;
      }
      
      if (isSignUp) {
        const { error } = await signUpWithEmail(email, password, fullName || undefined);
        if (error) {
          const msg = (error as Error).message?.toLowerCase() || '';
          // If the user already exists, transparently fall back to sign-in with the same creds.
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
            const friendlyMessage = getAuthErrorMessage(error);
            toast({ title: "Sign Up Failed", description: friendlyMessage, variant: "destructive" });
          }
        } else {
          resetRateLimit();
          // If email confirmation is disabled in Supabase, signUp returns a session immediately
          // and the auth listener will redirect. Otherwise, try to sign in right away — if that
          // also fails because confirmation is required, tell the user to check their inbox.
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
          resetRateLimit(); // Reset on success
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    try {
      // Check rate limiting first
      const rateLimitCheck = checkRateLimit();
      if (rateLimitCheck.blocked) {
        toast({ 
          title: "Too Many Attempts", 
          description: `Please wait ${Math.ceil(rateLimitCheck.remainingSeconds / 60)} minute(s) before trying again.`,
          variant: "destructive" 
        });
        return;
      }

      if (!otpSent) {
        // Validate phone
        const phoneResult = phoneSchema.safeParse(phoneNumber);
        if (!phoneResult.success) {
          toast({ title: "Invalid Phone", description: "Please enter a valid phone number with country code (e.g., +919876543210)", variant: "destructive" });
          return;
        }

        setIsLoading(true);
        
        // Record attempt for rate limiting
        const attemptResult = recordAuthAttempt();
        if (attemptResult.blocked) {
          toast({ 
            title: "Too Many Attempts", 
            description: `Please wait ${Math.ceil(attemptResult.remainingSeconds / 60)} minute(s) before trying again.`,
            variant: "destructive" 
          });
          setIsLoading(false);
          return;
        }

        const { error } = await signInWithPhone(phoneNumber);
        if (error) {
          const friendlyMessage = getAuthErrorMessage(error);
          toast({ title: "OTP Failed", description: friendlyMessage, variant: "destructive" });
        } else {
          setOtpSent(true);
          toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
        }
      } else {
        // Verify OTP
        if (otp.length !== 6) {
          toast({ title: "Invalid OTP", description: "Please enter the 6-digit code.", variant: "destructive" });
          return;
        }

        setIsLoading(true);
        
        // Record attempt for rate limiting
        const attemptResult = recordAuthAttempt();
        if (attemptResult.blocked) {
          toast({ 
            title: "Too Many Attempts", 
            description: `Please wait ${Math.ceil(attemptResult.remainingSeconds / 60)} minute(s) before trying again.`,
            variant: "destructive" 
          });
          setIsLoading(false);
          return;
        }

        const { error } = await verifyOtp(phoneNumber, otp);
        if (error) {
          toast({ title: "Verification Failed", description: "Invalid or expired code. Please try again.", variant: "destructive" });
        } else {
          resetRateLimit(); // Reset on success
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    // Check rate limiting first
    const rateLimitCheck = checkRateLimit();
    if (rateLimitCheck.blocked) {
      toast({ 
        title: "Too Many Attempts", 
        description: `Please wait ${Math.ceil(rateLimitCheck.remainingSeconds / 60)} minute(s) before trying again.`,
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    
    // Record attempt for rate limiting
    const attemptResult = recordAuthAttempt();
    if (attemptResult.blocked) {
      toast({ 
        title: "Too Many Attempts", 
        description: `Please wait ${Math.ceil(attemptResult.remainingSeconds / 60)} minute(s) before trying again.`,
        variant: "destructive" 
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signInWithGoogle();
    if (error) {
      const friendlyMessage = getAuthErrorMessage(error);
      toast({ title: "Google Sign In Failed", description: friendlyMessage, variant: "destructive" });
      setIsLoading(false);
    } else {
      resetRateLimit(); // Reset on success
    }
  };



  return (
    <div className="min-h-screen bg-background flex flex-col w-full md:max-w-[430px] mx-auto">
      {/* Header with logo */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pt-12 pb-8 px-8 text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <Zap className="w-4 h-4 text-success -ml-2 -mt-4" />
        </div>
         <h1 className="text-2xl font-bold text-secondary">Blood<span className="text-primary">Lyn</span></h1>
        <p className="text-muted-foreground mt-2">
          {isSignUp ? "Create your account" : "Sign in to continue"}
        </p>
      </motion.div>

      {/* Login form */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 px-6"
      >
        <Tabs defaultValue="phone" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted p-1 rounded-xl">
            <TabsTrigger value="phone" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Phone
            </TabsTrigger>
            <TabsTrigger value="email" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="phone" className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="tel"
                maxLength={15}
                placeholder="+91 9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(sanitizeInternationalPhone(e.target.value))}
                disabled={otpSent}
                className="pl-12 h-14 rounded-xl bg-muted border-0 text-base"
              />
            </div>
            {otpSent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="relative"
              >
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="pl-12 h-14 rounded-xl bg-muted border-0 text-base tracking-widest"
                />
              </motion.div>
            )}
            <Button onClick={handlePhoneAuth} className="w-full" variant="hero" size="lg" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : otpSent ? "Verify OTP" : isSignUp ? "Sign Up with OTP" : "Sign In with OTP"}
            </Button>
            {otpSent ? (
              <button
                onClick={() => { setOtpSent(false); setOtp(""); }}
                className="text-sm text-primary font-medium w-full text-center"
              >
                Change phone number
              </button>
            ) : (
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-muted-foreground w-full text-center"
              >
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <span className="text-primary font-medium">{isSignUp ? "Sign In" : "Sign Up"}</span>
              </button>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="relative"
              >
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-12 h-14 rounded-xl bg-muted border-0 text-base"
                />
              </motion.div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-14 rounded-xl bg-muted border-0 text-base"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleEmailAuth();
                  }
                }}
                className="pl-12 pr-12 h-14 rounded-xl bg-muted border-0 text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
            <Button onClick={handleEmailAuth} className="w-full" variant="hero" size="lg" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isSignUp ? "Create Account" : "Sign In"}
            </Button>
            {!isSignUp && (
              <button
                onClick={async () => {
                  const emailResult = emailSchema.safeParse(email);
                  if (!emailResult.success) {
                    toast({ title: "Enter Email", description: "Please enter your email address first", variant: "destructive" });
                    return;
                  }
                  setIsLoading(true);
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin
                  });
                  setIsLoading(false);
                  if (error) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Check Your Email", description: "Password reset link sent to your email." });
                  }
                }}
                className="text-sm text-primary font-medium w-full text-center"
              >
                Forgot Password?
              </button>
            )}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground w-full text-center"
            >
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <span className="text-primary font-medium">{isSignUp ? "Sign In" : "Sign Up"}</span>
            </button>
          </TabsContent>
        </Tabs>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">or continue with</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Social login */}
        <div className="space-y-3">
          <Button variant="glass" className="w-full" size="lg" onClick={handleGoogleAuth} disabled={isLoading}>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>


        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-6 pb-8 safe-area-bottom text-center"
      >
        <p className="text-sm text-muted-foreground">
          By continuing, you agree to our{" "}
          <button className="text-primary font-medium">Terms</button> and{" "}
          <button className="text-primary font-medium">Privacy Policy</button>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
