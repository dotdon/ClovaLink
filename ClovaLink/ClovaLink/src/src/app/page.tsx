import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function Home() {
  try {
    const session = await getServerSession(authOptions);
    
    // Simple redirect based on auth status
    if (session?.user) {
      redirect('/dashboard');
    } else {
      redirect('/auth/signin');
    }
  } catch (error) {
    console.error('Session error:', error);
    redirect('/auth/signin');
  }

  // This return is just for TypeScript
  return null;
} 