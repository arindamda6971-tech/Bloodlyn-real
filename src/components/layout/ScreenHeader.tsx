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
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`sticky top-0 z-50 px-4 py-4 rounded-b-2xl ${
        transparent
          ? "bg-transparent"
          : "bg-background/95 backdrop-blur-xl border-b border-border/50"
      }`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 12px) + 16px)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="icon-btn"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          )}
          <h1 className="text-lg font-bold text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {rightAction}
          {showMenu && (
            <button className="icon-btn">
              <MoreVertical className="w-5 h-5 text-foreground" />
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default ScreenHeader;
