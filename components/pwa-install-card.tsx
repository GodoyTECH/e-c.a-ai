'use client';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

import { useEffect, useMemo, useState } from 'react';

const DISMISS_KEY = 'pwa-install-dismissed';

export function PwaInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const wasDismissed = localStorage.getItem(DISMISS_KEY) === '1';
    setDismissed(wasDismissed);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const isIos = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  if (installed || dismissed) return null;

  const canPrompt = Boolean(deferredPrompt);
  const shouldShow = canPrompt || isIos;

  if (!shouldShow) return null;

  return (
    <aside className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur md:left-auto md:w-[360px]">
      <h2 className="font-semibold text-slate-900">Instalar app</h2>
      {canPrompt ? (
        <p className="mt-1 text-sm text-slate-600">Instale para abrir mais rápido e usar em modo app.</p>
      ) : (
        <p className="mt-1 text-sm text-slate-600">No iPhone: toque em compartilhar e depois em “Adicionar à Tela de Início”.</p>
      )}

      <div className="mt-3 flex gap-2">
        {canPrompt && (
          <button
            className="btn-primary"
            type="button"
            onClick={async () => {
              if (!deferredPrompt) return;
              await deferredPrompt.prompt();
              await deferredPrompt.userChoice;
              setDeferredPrompt(null);
            }}
          >
            Instalar
          </button>
        )}
        <button
          className="btn-secondary"
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setDismissed(true);
          }}
        >
          Agora não
        </button>
      </div>
    </aside>
  );
}
