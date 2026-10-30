import { ArrowLeft, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    <header
      className={`sticky top-0 z-40 px-3 sm:px-4 h-14 flex items-center transition-colors duration-200 ${
        transparent
          ? "bg-transparent"
          : "bg-background border-b border-border/40"
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-accent flex items-center justify-center transition-colors shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {rightAction}
          {showMenu && (
            <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-accent flex items-center justify-center transition-colors">
              <MoreVertical className="w-5 h-5 text-foreground" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default ScreenHeader;
