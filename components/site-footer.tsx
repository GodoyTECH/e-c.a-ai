import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-slate-600 md:px-8">
        <span>Desenvolvido por <strong>Godoy Solutions In TECH</strong></span>
        <Link href="https://godoysoluintech.netlify.app/" target="_blank" rel="noreferrer" className="font-semibold text-acai hover:underline">
          Contate-nos / Faça um orçamento
        </Link>
      </div>
    </footer>
  );
}
