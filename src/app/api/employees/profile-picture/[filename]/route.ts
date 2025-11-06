import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const PROFILE_PICTURES_DIR = process.env.UPLOAD_DIR 
  ? join(process.env.UPLOAD_DIR, 'profile-pictures')
  : './uploads/profile-pictures';

// GET: Serve profile picture
export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Basic security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = join(PROFILE_PICTURES_DIR, filename);
    
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Profile picture not found' }, { status: 404 });
    }

    const fileContent = await readFile(filePath);
    
    // Determine content type from extension
    const extension = filename.split('.').pop()?.toLowerCase();
    const contentTypeMap: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    
    const contentType = contentTypeMap[extension || ''] || 'image/jpeg';
    
    const response = new NextResponse(fileContent);
    response.headers.set('Content-Type', contentType);
    response.headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    response.headers.set('Content-Length', fileContent.length.toString());
    
    return response;
  } catch (error) {
    console.error('Error serving profile picture:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

