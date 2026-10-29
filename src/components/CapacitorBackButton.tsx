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

      // Home's search screen adds a history step: Back closes it first.
      const searchOpen = (location.state as { searchOpen?: boolean } | null)?.searchOpen === true;

      if (isMainPage && !searchOpen) {
        App.exitApp();
      } else {
        // Use React Router history to go back deterministically
        navigate(-1);
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
