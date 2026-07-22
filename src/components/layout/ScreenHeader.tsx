import { ArrowLeft, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  onBack?: () => void;
}

/**
 * Ultra-premium, senior-engineered top bar header for inner sub-screens.
 */
const ScreenHeader = ({
  title,
  showBack = true,
  showMenu = false,
  rightAction,
  transparent = false,
  onBack,
}: ScreenHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <motion.header
      initial={{ y: -15, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`sticky top-0 z-50 px-5 py-4 transition-colors duration-300 ${
        transparent
          ? "bg-transparent"
          : "bg-background/80 backdrop-blur-2xl saturate-150 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)]"
      }`}
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
        height: "calc(env(safe-area-inset-top, 0px) + 72px)",
        display: "flex",
        alignItems: "center"
      }}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3.5 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="w-10.5 h-10.5 rounded-2xl bg-card/90 backdrop-blur-md border border-border/60 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-90 hover:scale-[1.04] hover:bg-accent/60 transition-all shrink-0 group"
              aria-label="Go back"
            >
              <ArrowLeft className="w-[20px] h-[20px] text-foreground group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
          <h1 className="text-[20px] sm:text-[22px] font-black text-foreground tracking-tight truncate leading-none pt-0.5">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {rightAction}
          {showMenu && (
            <button className="w-10.5 h-10.5 rounded-2xl bg-card/90 backdrop-blur-md border border-border/60 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-90 hover:scale-[1.04] hover:bg-accent/60 transition-all">
              <MoreVertical className="w-[20px] h-[20px] text-foreground" />
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default ScreenHeader;
