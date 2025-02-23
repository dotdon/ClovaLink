import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function GET(
  request: Request,
  context: { params: { token: string } }
) {
  try {
    // Wait for params to be available
    const params = await Promise.resolve(context.params);
    const token = params.token;

    // Find and validate the upload link
    const uploadLink = await prisma.uploadLink.findFirst({
      where: {
        token,
      },
      include: {
        employee: {
          select: {
            id: true,
            companyId: true
          }
        }
      }
    });

    if (!uploadLink) {
      return NextResponse.json(
        { error: 'Upload link not found' },
        { status: 404 }
      );
    }

    // Check if link has expired
    if (new Date(uploadLink.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Upload link has expired' },
        { status: 400 }
      );
    }

    // Check if link has reached maximum uses
    if (uploadLink.useCount + 1 > uploadLink.maxUses) {
      return NextResponse.json(
        { error: 'Upload link has reached maximum uses' },
        { status: 400 }
      );
    }

    // Check if link has been marked as used
    if (uploadLink.used) {
      return NextResponse.json(
        { error: 'Upload link has already been used' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      valid: true,
      data: {
        employeeId: uploadLink.employee.id,
        companyId: uploadLink.employee.companyId
      }
    });
  } catch (error) {
    console.error('Error validating upload link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 