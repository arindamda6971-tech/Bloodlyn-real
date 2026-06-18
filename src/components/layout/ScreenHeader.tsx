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
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`sticky top-0 z-50 px-5 py-4 ${
        transparent
          ? "bg-transparent"
          : "bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-sm shadow-black/5"
      }`}
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        height: "calc(env(safe-area-inset-top, 0px) + 68px)",
        display: "flex",
        alignItems: "center"
      }}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3.5 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center active:scale-90 transition-transform shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          )}
          <h1 className="text-xl font-black text-foreground tracking-tight truncate leading-none pt-0.5">{title}</h1>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {rightAction}
          {showMenu && (
            <button className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center active:scale-90 transition-transform">
              <MoreVertical className="w-5 h-5 text-foreground" />
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default ScreenHeader;
