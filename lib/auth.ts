import { cookies } from 'next/headers';

const COOKIE_NAME = 'admin_session';

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || '0';
}

export async function isAdminAuthenticated() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === getAdminPassword();
}

export function adminCookieName() {
  return COOKIE_NAME;
}
