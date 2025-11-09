import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: Fetch public key for a user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      select: { id: true, name: true, publicKey: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      userId: employee.id,
      name: employee.name,
      publicKey: employee.publicKey,
      hasKey: !!employee.publicKey
    });
  } catch (error) {
    console.error('Error fetching public key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Store public key for current user
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { publicKey } = body;

    if (!publicKey || typeof publicKey !== 'string') {
      return NextResponse.json({ error: 'Valid public key required' }, { status: 400 });
    }

    // Update employee with public key
    await prisma.employee.update({
      where: { id: session.user.id },
      data: { publicKey },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Public key stored successfully'
    });
  } catch (error) {
    console.error('Error storing public key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

