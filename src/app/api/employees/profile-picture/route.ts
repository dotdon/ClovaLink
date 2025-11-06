import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import prisma from '@/lib/prisma';

const PROFILE_PICTURES_DIR = process.env.UPLOAD_DIR 
  ? join(process.env.UPLOAD_DIR, 'profile-pictures')
  : './uploads/profile-pictures';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.error('[Profile Picture] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Profile Picture] Starting upload for user:', session.user.id);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('[Profile Picture] No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[Profile Picture] File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Ensure profile pictures directory exists
    if (!existsSync(PROFILE_PICTURES_DIR)) {
      console.log('[Profile Picture] Creating directory:', PROFILE_PICTURES_DIR);
      await mkdir(PROFILE_PICTURES_DIR, { recursive: true });
    } else {
      console.log('[Profile Picture] Directory exists:', PROFILE_PICTURES_DIR);
    }

    // Get current employee to check for existing profile picture
    const currentEmployee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: { profilePicture: true }
    });

    // Delete old profile picture if it exists
    if (currentEmployee?.profilePicture) {
      const oldFilePath = join(PROFILE_PICTURES_DIR, currentEmployee.profilePicture);
      if (existsSync(oldFilePath)) {
        try {
          await unlink(oldFilePath);
        } catch (error) {
          console.error('Error deleting old profile picture:', error);
        }
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `${session.user.id}-${timestamp}.${extension}`;
    const filePath = join(PROFILE_PICTURES_DIR, filename);

    // Save the file
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    
    console.log('[Profile Picture] Saving to:', filePath);
    
    try {
      await writeFile(filePath, buffer);
      console.log('[Profile Picture] File saved successfully');
    } catch (error) {
      console.error('[Profile Picture] Error saving file:', error);
      return NextResponse.json(
        { error: `Failed to save profile picture: ${error}` },
        { status: 500 }
      );
    }

    // Update employee record with new profile picture
    console.log('[Profile Picture] Updating database for user:', session.user.id);
    
    const updatedEmployee = await prisma.employee.update({
      where: { id: session.user.id },
      data: { profilePicture: filename },
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true
      }
    });

    console.log('[Profile Picture] Upload complete:', filename);

    return NextResponse.json({ 
      success: true,
      profilePicture: filename,
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('[Profile Picture] Error uploading:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// DELETE: Remove profile picture
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: { profilePicture: true }
    });

    if (!employee?.profilePicture) {
      return NextResponse.json({ error: 'No profile picture to delete' }, { status: 404 });
    }

    // Delete the file
    const filePath = join(PROFILE_PICTURES_DIR, employee.profilePicture);
    if (existsSync(filePath)) {
      try {
        await unlink(filePath);
      } catch (error) {
        console.error('Error deleting profile picture file:', error);
      }
    }

    // Update employee record
    await prisma.employee.update({
      where: { id: session.user.id },
      data: { profilePicture: null }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

