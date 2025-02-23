import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';
import { DefaultSession } from 'next-auth';

const prisma = new PrismaClient();

declare module 'next-auth' {
  interface User {
    id: string;
    role: string;
    companyId: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      companyId: string;
    } & DefaultSession['user']
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        const employee = await prisma.employee.findUnique({
          where: { email: credentials.email },
        });

        if (!employee) {
          throw new Error('Invalid credentials');
        }

        const isPasswordValid = await compare(credentials.password, employee.password);

        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: employee.id,
          email: employee.email,
          name: employee.name,
          role: employee.role,
          companyId: employee.companyId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.companyId = token.companyId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}; 