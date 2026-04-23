'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function SwRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const isAdmin = pathname.startsWith('/admin');
    const script = isAdmin ? '/sw-admin.js' : '/sw-site.js';
    const scope = isAdmin ? '/admin/' : '/';

    navigator.serviceWorker
      .register(script, { scope })
      .then((registration) => registration.update())
      .catch(() => undefined);
  }, [pathname]);

  return null;
}
