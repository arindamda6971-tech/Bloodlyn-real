import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';

const CapacitorBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = App.addListener('backButton', (data) => {
      if (location.pathname === '/' || location.pathname === '/home' || location.pathname === '/login') {
        // On main screens, minimize the app or exit
        App.exitApp();
      } else {
        // Otherwise, go back in history
        navigate(-1);
      }
    });

    return () => {
      handler.then(h => h.remove());
    };
  }, [location, navigate]);

  return null;
};

export default CapacitorBackButton;
