import Link from 'next/link';

export default function OrderSuccessPage({ searchParams }: { searchParams: { code?: string } }) {
  return (
    <main className="mx-auto max-w-xl p-8">
      <div className="card text-center">
        <h1 className="text-2xl font-bold text-acai">Pedido recebido 🎉</h1>
        <p className="mt-3">Código: {searchParams.code}</p>
        <p className="mt-2 text-sm text-slate-600">
          O pedido foi salvo com status <strong>pending_whatsapp</strong>. Você será redirecionado ao WhatsApp para envio.
        </p>
        <Link className="btn-primary mt-6 inline-block" href="/">
          Voltar à loja
        </Link>
      </div>
    </main>
  );
}
