import { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { setOnline } = useUIStore();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  return isOnline;
}
