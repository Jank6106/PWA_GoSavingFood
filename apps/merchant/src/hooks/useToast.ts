import { useCallback, useEffect, useState } from 'react';

export function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);
  const showToast = useCallback((message: string) => setToastMessage(message), []);
  return { toastMessage, showToast };
}

