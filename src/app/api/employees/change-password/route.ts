import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/services/activityLogger';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('[Change Password API] Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
    });
    
    if (!session?.user?.id) {
      console.error('[Change Password API] ❌ Unauthorized - no session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter' },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password must contain at least one number' },
        { status: 400 }
      );
    }

    // Get employee
    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, employee.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, employee.password);
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear mustChangePassword flag
    // Use explicit update to ensure the flag is set to false
    const updatedEmployee = await prisma.employee.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false, // Explicitly set to false
        updatedAt: new Date(),
      },
    });

    // Verify the update worked by reading it back
    const verifyEmployee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        mustChangePassword: true,
      },
    });

    console.log('[Change Password API] ✅ Password updated successfully:', {
      employeeId: updatedEmployee.id,
      mustChangePasswordAfterUpdate: verifyEmployee?.mustChangePassword,
      updateVerified: verifyEmployee?.mustChangePassword === false,
    });

    if (verifyEmployee?.mustChangePassword !== false) {
      console.error('[Change Password API] ❌ CRITICAL: mustChangePassword is still true after update!');
      // Force update again
      await prisma.employee.update({
        where: { id: session.user.id },
        data: {
          mustChangePassword: false,
        },
      });
      console.log('[Change Password API] 🔄 Force-updated mustChangePassword to false');
    }

    // Log activity
    await logActivity({
      type: 'PASSWORD_CHANGE',
      description: 'Changed password',
      employeeId: session.user.id,
      companyId: session.user.companyId,
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
      mustChangePassword: updatedEmployee.mustChangePassword, // Verify it's false
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}

