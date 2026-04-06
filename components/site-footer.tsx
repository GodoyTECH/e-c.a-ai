import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200/80 bg-white/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-center text-xs text-slate-600 md:flex-row md:items-center md:justify-between md:px-8 md:text-sm">
        <span>Desenvolvido por Godoy Solutions In TECH</span>
        <Link href="https://godoysoluintech.netlify.app/" target="_blank" rel="noreferrer" className="text-acai underline">
          Solicite um orçamento
        </Link>
      </div>
    </footer>
  );
}
