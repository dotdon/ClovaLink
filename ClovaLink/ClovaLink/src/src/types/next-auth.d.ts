import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      companyId: string;
    } & DefaultSession['user']
  }

  interface User {
    id: string;
    role: string;
    companyId: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
} 