import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';

const CapacitorBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBackButton = async () => {
      // Exit the app if on main entry points
      const isMainPage =
        location.pathname === '/' ||
        location.pathname === '/home' ||
        location.pathname === '/login' ||
        location.pathname === '/onboarding';

      if (isMainPage) {
        App.exitApp();
      } else {
        // Use browser history to go back naturally
        window.history.back();
      }
    };

    const listener = App.addListener('backButton', handleBackButton);

    return () => {
      listener.then(l => l.remove());
    };
  }, [location]);

  return null;
};

export default CapacitorBackButton;
