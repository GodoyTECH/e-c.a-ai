'use client';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';


const DISMISS_KEY_SITE = 'pwa-install-dismissed-site';
const DISMISS_KEY_ADMIN = 'pwa-install-dismissed-admin';
const INSTALLED_KEY_SITE = 'pwa-installed-site';
const INSTALLED_KEY_ADMIN = 'pwa-installed-admin';

export function PwaInstallCard() {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  const dismissKey = isAdminPage ? DISMISS_KEY_ADMIN : DISMISS_KEY_SITE;
  const installedKey = isAdminPage ? INSTALLED_KEY_ADMIN : INSTALLED_KEY_SITE;

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const alreadyInstalled = localStorage.getItem(installedKey) === '1';
    if (alreadyInstalled || window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const wasDismissed = localStorage.getItem(dismissKey) === '1';
    setDismissed(wasDismissed);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      localStorage.setItem(installedKey, '1');
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [dismissKey, installedKey]);

  const isIos = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  if (installed || dismissed) return null;

  const canPrompt = Boolean(deferredPrompt);
  const shouldShow = canPrompt || isIos || isAdminPage;
  if (!shouldShow) return null;

  return (
    <aside className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur md:left-auto md:w-[360px]">
      <h2 className="font-semibold text-slate-900">{isAdminPage ? 'Instalar painel admin' : 'Instalar app da loja'}</h2>
      {canPrompt ? (
        <p className="mt-1 text-sm text-slate-600">
          {isAdminPage
            ? 'Instale o painel para acesso rápido aos pedidos e configurações.'
            : 'Instale a loja para abrir mais rápido e usar em modo app.'}
        </p>

      ) : isIos ? (
        <p className="mt-1 text-sm text-slate-600">No iPhone: toque em compartilhar e depois em “Adicionar à Tela de Início”.</p>
      ) : (
        <p className="mt-1 text-sm text-slate-600">No Chrome: abra o menu do navegador e toque em “Instalar app”.</p>

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
            localStorage.setItem(dismissKey, '1');
            setDismissed(true);
          }}
        >
          Agora não
        </button>
      </div>
    </aside>
  );
}
