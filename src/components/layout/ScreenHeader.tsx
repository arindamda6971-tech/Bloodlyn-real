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
      className={`sticky top-0 z-50 px-4 py-4 transition-colors duration-300 ${
        transparent
          ? "bg-transparent"
          : "bg-background border-none shadow-none rounded-b-2xl"
      }`}
      style={{
        paddingTop: "calc(var(--sat) + 16px)",
        height: "calc(var(--sat) + 64px)",
        display: "flex",
        alignItems: "center"
      }}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full hover:bg-accent flex items-center justify-center transition-colors shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          )}
          <h1 className="text-xl font-bold text-foreground truncate pt-0.5">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rightAction}
          {showMenu && (
            <button className="w-10 h-10 rounded-full hover:bg-accent flex items-center justify-center transition-colors">
              <MoreVertical className="w-5 h-5 text-foreground" />
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default ScreenHeader;
