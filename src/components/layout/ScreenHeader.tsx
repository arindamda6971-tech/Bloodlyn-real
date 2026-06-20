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
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`sticky top-0 z-50 px-5 py-4 transition-colors duration-300 ${
        transparent
          ? "bg-transparent"
          : "bg-background/70 backdrop-blur-[32px] saturate-150 border-b border-border/20 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.08)]"
      }`}
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
        height: "calc(env(safe-area-inset-top, 0px) + 72px)",
        display: "flex",
        alignItems: "center"
      }}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="w-11 h-11 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-center active:scale-95 transition-transform shrink-0 hover:bg-accent/50"
            >
              <ArrowLeft className="w-[22px] h-[22px] text-foreground" />
            </button>
          )}
          <h1 className="text-[22px] font-black text-foreground tracking-tight truncate leading-none pt-0.5">{title}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {rightAction}
          {showMenu && (
            <button className="w-11 h-11 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-center active:scale-95 transition-transform hover:bg-accent/50">
              <MoreVertical className="w-[22px] h-[22px] text-foreground" />
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default ScreenHeader;
