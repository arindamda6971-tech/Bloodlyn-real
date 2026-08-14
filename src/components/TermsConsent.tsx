import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

interface TermsConsentProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function TermsConsent({ checked, onCheckedChange, className = "" }: TermsConsentProps) {
  return (
    <div className={`flex items-start gap-3 p-3 bg-muted/20 border border-border/40 rounded-xl ${className}`}>
      <Checkbox 
        id="terms-consent" 
        checked={checked} 
        onCheckedChange={(checked) => onCheckedChange(checked as boolean)}
        className="mt-0.5"
      />
      <div className="flex-1 text-[11px] leading-tight text-muted-foreground">
        <label htmlFor="terms-consent" className="cursor-pointer">
          By continuing, I confirm that I have read and agree to the{" "}
        </label>
        <Link to="/terms" className="text-primary font-bold hover:underline" onClick={(e) => e.stopPropagation()}>
          Terms & Conditions
        </Link>
        {" "}and{" "}
        <Link to="/privacy-policy" className="text-primary font-bold hover:underline" onClick={(e) => e.stopPropagation()}>
          Privacy Policy
        </Link>.
      </div>
    </div>
  );
}
