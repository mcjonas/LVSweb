import { cookies } from 'next/headers';

export async function checkAuth() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('dashboard_auth');
  
  if (!authCookie || authCookie.value !== 'authenticated') {
    throw new Error('Unauthorized');
  }
}
