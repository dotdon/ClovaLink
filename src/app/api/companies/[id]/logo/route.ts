import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update company logos
    if (!hasPermission(session, Permission.EDIT_COMPANIES)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Delete old logo if exists
    if (company.logo) {
      try {
        const oldLogoPath = path.join(process.cwd(), 'uploads', 'company-logos', company.logo);
        if (fs.existsSync(oldLogoPath)) {
          await unlink(oldLogoPath);
        }
      } catch (error) {
        console.error('Error deleting old logo:', error);
      }
    }

    // Create company-logos directory if it doesn't exist
    const logoDir = path.join(process.cwd(), 'uploads', 'company-logos');
    if (!fs.existsSync(logoDir)) {
      fs.mkdirSync(logoDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(file.name);
    const filename = `${id}-${Date.now()}${ext}`;
    const filepath = path.join(logoDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Update database
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: { logo: filename },
    });

    return NextResponse.json({
      message: 'Logo uploaded successfully',
      logo: filename,
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update company logos
    if (!hasPermission(session, Permission.EDIT_COMPANIES)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (!company.logo) {
      return NextResponse.json({ error: 'No logo to delete' }, { status: 400 });
    }

    // Delete logo file
    try {
      const logoPath = path.join(process.cwd(), 'uploads', 'company-logos', company.logo);
      if (fs.existsSync(logoPath)) {
        await unlink(logoPath);
      }
    } catch (error) {
      console.error('Error deleting logo file:', error);
    }

    // Update database
    await prisma.company.update({
      where: { id },
      data: { logo: null },
    });

    return NextResponse.json({ message: 'Logo deleted successfully' });
  } catch (error) {
    console.error('Error deleting logo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

