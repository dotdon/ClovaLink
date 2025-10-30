import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/services/activityLogger';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // Group settings by category
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push({
        id: setting.id,
        key: setting.key,
        value: setting.isEncrypted ? '********' : setting.value,
        description: setting.description,
        isEncrypted: setting.isEncrypted,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { key, value, category, description, isEncrypted } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        category: category || 'general',
        description,
        isEncrypted: isEncrypted || false,
        updatedBy: session.user.id,
      },
      update: {
        value,
        category: category || 'general',
        description,
        isEncrypted: isEncrypted || false,
        updatedBy: session.user.id,
      },
    });

    await logActivity({
      type: 'SETTING_UPDATE',
      description: `Updated system setting: ${key}`,
      employeeId: session.user.id,
      companyId: session.user.companyId,
      metadata: { key, category },
    });

    return NextResponse.json({
      id: setting.id,
      key: setting.key,
      value: setting.isEncrypted ? '********' : setting.value,
      description: setting.description,
      isEncrypted: setting.isEncrypted,
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { settings } = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Settings must be an array' },
        { status: 400 }
      );
    }

    // Bulk update settings
    const results = await Promise.all(
      settings.map(async (s: any) => {
        return prisma.systemSetting.upsert({
          where: { key: s.key },
          create: {
            key: s.key,
            value: s.value,
            category: s.category || 'general',
            description: s.description,
            isEncrypted: s.isEncrypted || false,
            updatedBy: session.user.id,
          },
          update: {
            value: s.value,
            category: s.category || 'general',
            description: s.description,
            isEncrypted: s.isEncrypted || false,
            updatedBy: session.user.id,
          },
        });
      })
    );

    await logActivity({
      type: 'SETTINGS_BULK_UPDATE',
      description: `Bulk updated ${settings.length} system settings`,
      employeeId: session.user.id,
      companyId: session.user.companyId,
      metadata: { count: settings.length },
    });

    return NextResponse.json({
      success: true,
      count: results.length,
    });
  } catch (error) {
    console.error('Error bulk updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

