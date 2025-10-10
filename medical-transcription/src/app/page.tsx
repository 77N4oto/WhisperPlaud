import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validateToken } from '@/lib/auth';

export default async function Home() {
  const token = (await cookies()).get('auth-token')?.value;
  const authed = token ? validateToken(token).valid : false;
  redirect(authed ? '/dashboard' : '/login');
}

