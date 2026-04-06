const BR_TIMEZONE = 'America/Sao_Paulo';

export function formatDateTimeBR(value: string | number | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: BR_TIMEZONE
  }).format(new Date(value));
}

export function formatTimeBR(value: string | number | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: BR_TIMEZONE
  }).format(new Date(value));
}

export function formatDateBR(value: string | number | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeZone: BR_TIMEZONE
  }).format(new Date(value));
}

export function nowIso() {
  return new Date().toISOString();
}

export const BRASILIA_TZ = BR_TIMEZONE;
