'use client';

import { useEffect, useState } from 'react';
import { formatDateBR, formatTimeBR } from '@/lib/time';

export function BrClock({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white/80 px-3 py-1.5 text-right text-xs text-slate-600 ${className}`.trim()}>
      <p className="font-semibold text-slate-700">{formatTimeBR(now)}</p>
      {!compact && <p>{formatDateBR(now)}</p>}
      <p className="text-[10px] uppercase tracking-wide">Horário de Brasília</p>
    </div>
  );
}
