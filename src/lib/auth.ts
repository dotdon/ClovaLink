import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { DefaultSession } from 'next-auth';
import prisma from './prisma';

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
        if (!credentials?.email) {
          throw new Error('Missing email');
        }

        const employee = await prisma.employee.findUnique({
          where: { email: credentials.email },
        });

        if (!employee) {
          throw new Error('Invalid credentials');
        }

        // Check if this is a passkey authentication
        if (credentials.passkey === 'true' || credentials.password === '__passkey__') {
          // Passkey authentication - user is already verified via passkey endpoint
          // Check if 2FA is enabled for passkey auth
          if (employee.totpEnabled) {
            // Check if TOTP code is provided and not empty
            if (!credentials.totpCode || credentials.totpCode.trim().length === 0) {
              throw new Error('TOTP_REQUIRED');
            }
            // Verify TOTP code
            const { verifyTOTP } = await import('./totp');
            const isValid = verifyTOTP(employee.totpSecret!, credentials.totpCode);
            if (!isValid) {
              throw new Error('Invalid TOTP code');
            }
          }
          // Just return the user
          return {
            id: employee.id,
            email: employee.email,
            name: employee.name,
            role: employee.role,
            companyId: employee.companyId,
          };
        }

        // Regular password authentication
        if (!credentials.password) {
          throw new Error('Missing password');
        }

        const isPasswordValid = await compare(credentials.password, employee.password);

        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        // Check if 2FA is enabled
        if (employee.totpEnabled) {
          // Check if TOTP code is provided and not empty
          if (!credentials.totpCode || credentials.totpCode.trim().length === 0) {
            throw new Error('TOTP_REQUIRED');
          }
          // Verify TOTP code
          const { verifyTOTP } = await import('./totp');
          const isValid = verifyTOTP(employee.totpSecret!, credentials.totpCode);
          if (!isValid) {
            throw new Error('Invalid TOTP code');
          }
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
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;

        // Track login activity on first sign-in
        if (account) {
          try {
            // Update employee last login info
            await prisma.employee.update({
              where: { id: user.id },
              data: {
                lastLoginAt: new Date(),
                isActive: true,
                lastActivityAt: new Date(),
              },
            });

            // Note: IP and user agent will be added via trackLoginActivity function
            // Create login activity record (basic)
            await prisma.loginActivity.create({
              data: {
                employeeId: user.id,
                loginAt: new Date(),
                success: true,
              },
            });
          } catch (error) {
            console.error('Error tracking login:', error);
          }
        }
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
    signIn: '/auth/signin',
    signOut: '/auth/signout',
  },
  session: {
    strategy: 'jwt',
  },
}; 