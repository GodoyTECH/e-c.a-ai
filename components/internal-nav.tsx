'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

function shouldHide(pathname: string) {
  return pathname === '/' || pathname === '/admin' || pathname === '/admin/login';
}

export function InternalNav() {
  const router = useRouter();
  const pathname = usePathname();

  if (shouldHide(pathname)) return null;

  const isAdmin = pathname.startsWith('/admin');
  const homeHref = isAdmin ? '/admin' : '/';

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 md:px-8">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
              return;
            }
            router.push(homeHref);
          }}
        >
          Voltar
        </button>

        <Link className="btn-primary" href={homeHref}>
          {isAdmin ? 'Painel' : 'Início'}
        </Link>
      </div>
    </div>
  );
}
