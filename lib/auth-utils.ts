import { cookies } from 'next/headers';
import { verifySessionToken } from './session';

export async function checkAuth() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('dashboard_auth');

  if (!authCookie || !(await verifySessionToken(authCookie.value))) {
    throw new Error('Unauthorized');
  }
}
