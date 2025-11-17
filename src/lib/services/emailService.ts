import nodemailer from 'nodemailer';
import prisma from '../prisma';
import { createLogger, logError } from '../logger';
import { getSmtpConfig } from '../settings';

const logger = createLogger('email');

// Lazy transporter initialization
let transporterInstance: nodemailer.Transporter | null = null;

async function getTransporter() {
  // Always create fresh transporter to use latest settings
  const config = await getSmtpConfig();
  
  if (!config.host || !config.user || !config.password) {
    throw new Error('SMTP configuration is incomplete. Please configure SMTP settings in the admin panel.');
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // Use TLS for port 465
    auth: {
      user: config.user,
      pass: config.password,
    },
  });
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Check if email notifications are enabled
async function isEmailEnabled(): Promise<boolean> {
  try {
    const { getSetting } = await import('../settings');
    const enabled = await getSetting('enable_email_notifications', 'ENABLE_EMAIL_NOTIFICATIONS', 'true');
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking email notification setting:', error);
    return false;
  }
}

export async function sendEmail({ to, subject, html, from }: EmailOptions) {
  // Check if email notifications are enabled
  if (!(await isEmailEnabled())) {
    logger.info({ to, subject }, 'Email notifications disabled, skipping');
    return null;
  }

  try {
    const transporter = await getTransporter();
    const config = await getSmtpConfig();
    
    const result = await transporter.sendMail({
      from: from || config.from || 'noreply@clovalink.local',
      to,
      subject,
      html,
    });
    logger.info({ to, subject }, 'Email sent successfully');
    return result;
  } catch (error) {
    logError(error, { to, subject, context: 'sendEmail' });
    // Don't throw - just log the error so the main flow continues
    console.error('Failed to send email:', error);
    return null;
  }
}

// Email templates
export const emailTemplates = {
  // Employee Invitation
  employeeInvited: (employeeName: string, companyName: string, loginUrl: string, tempPassword?: string) => ({
    subject: `Welcome to ${companyName} - Your Account Has Been Created`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">Welcome to ${companyName}!</h2>
        <p>Hello ${employeeName},</p>
        <p>Your account has been created for ${companyName}. You can now access the ClovaLink platform.</p>
        ${tempPassword ? `
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Your temporary password:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
            <p style="margin: 10px 0 0 0; font-size: 0.9em; color: #666;">You will be required to change this password on your first login.</p>
          </div>
        ` : ''}
        <p><a href="${loginUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Login to Your Account</a></p>
        <p style="color: #666; font-size: 0.9em;">If you have any questions, please contact your administrator.</p>
      </div>
    `,
  }),

  // Login Notification
  loginNotification: (employeeName: string, loginTime: string, ipAddress: string, location: string, userAgent: string) => ({
    subject: 'New Login Detected',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">New Login to Your Account</h2>
        <p>Hello ${employeeName},</p>
        <p>We detected a new login to your account:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Time:</strong> ${loginTime}</p>
          <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ipAddress}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${location || 'Unknown'}</p>
          <p style="margin: 5px 0;"><strong>Device:</strong> ${userAgent}</p>
        </div>
        <p>If this wasn't you, please secure your account immediately by changing your password.</p>
      </div>
    `,
  }),

  // Suspicious Login Alert
  suspiciousLogin: (employeeName: string, loginTime: string, ipAddress: string, location: string, userAgent: string, previousLocation?: string) => ({
    subject: '⚠️ Suspicious Login Attempt Detected',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc3545;">⚠️ Suspicious Login Detected</h2>
        <p>Hello ${employeeName},</p>
        <p style="color: #dc3545; font-weight: bold;">We detected a login from an unusual location or device.</p>
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Login Time:</strong> ${loginTime}</p>
          <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ipAddress}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${location || 'Unknown'}</p>
          ${previousLocation ? `<p style="margin: 5px 0;"><strong>Previous Location:</strong> ${previousLocation}</p>` : ''}
          <p style="margin: 5px 0;"><strong>Device:</strong> ${userAgent}</p>
        </div>
        <p><strong>If this was you:</strong> No action needed. You can safely ignore this email.</p>
        <p><strong>If this wasn't you:</strong> Please secure your account immediately:</p>
        <ul>
          <li>Change your password immediately</li>
          <li>Review your account activity</li>
          <li>Enable two-factor authentication if not already enabled</li>
          <li>Contact your administrator if you notice any unauthorized activity</li>
        </ul>
      </div>
    `,
  }),

  // Calendar Event Invitation
  calendarEventInvitation: (eventTitle: string, creatorName: string, startDate: string, endDate: string, location: string | null, description: string | null, eventUrl: string) => ({
    subject: `Calendar Invitation: ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">You've Been Invited to a Calendar Event</h2>
        <p>Hello,</p>
        <p><strong>${creatorName}</strong> has invited you to:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0;">${eventTitle}</h3>
          <p style="margin: 5px 0;"><strong>Start:</strong> ${startDate}</p>
          <p style="margin: 5px 0;"><strong>End:</strong> ${endDate}</p>
          ${location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${location}</p>` : ''}
          ${description ? `<p style="margin: 10px 0 0 0;">${description}</p>` : ''}
        </div>
        <p><a href="${eventUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Event in Calendar</a></p>
      </div>
    `,
  }),

  // Calendar Event Reminder
  calendarEventReminder: (eventTitle: string, startDate: string, location: string | null, minutesBefore: number) => ({
    subject: `Reminder: ${eventTitle} in ${minutesBefore} minute${minutesBefore !== 1 ? 's' : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">⏰ Calendar Reminder</h2>
        <p>This is a reminder for your upcoming event:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0;">${eventTitle}</h3>
          <p style="margin: 5px 0;"><strong>Starts in ${minutesBefore} minute${minutesBefore !== 1 ? 's' : ''}</strong></p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${startDate}</p>
          ${location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${location}</p>` : ''}
        </div>
      </div>
    `,
  }),

  // New Message Notification
  newMessage: (senderName: string, messagePreview: string, messageUrl: string) => ({
    subject: `New Message from ${senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">New Message</h2>
        <p>You have received a new message from <strong>${senderName}</strong>:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic;">
          ${messagePreview}
        </div>
        <p><a href="${messageUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Message</a></p>
      </div>
    `,
  }),
};

// Notification functions

/**
 * Send email when a new employee is invited/created
 */
export async function notifyEmployeeInvited(
  employeeId: string,
  tempPassword?: string
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!employee) return;

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const loginUrl = `${baseUrl}/auth/signin`;

    const { subject, html } = emailTemplates.employeeInvited(
      employee.name,
      employee.company.name,
      loginUrl,
      tempPassword
    );

    await sendEmail({
      to: employee.email,
      subject,
      html,
    });
  } catch (error) {
    logError(error, { employeeId, context: 'notifyEmployeeInvited' });
  }
}

/**
 * Send login notification email
 */
export async function notifyLogin(
  employeeId: string,
  ipAddress?: string,
  location?: string,
  userAgent?: string
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) return;

    const loginTime = new Date().toLocaleString();
    const { subject, html } = emailTemplates.loginNotification(
      employee.name,
      loginTime,
      ipAddress || 'Unknown',
      location || 'Unknown',
      userAgent || 'Unknown'
    );

    await sendEmail({
      to: employee.email,
      subject,
      html,
    });
  } catch (error) {
    logError(error, { employeeId, context: 'notifyLogin' });
  }
}

/**
 * Extract device fingerprint from user agent
 * Returns a simplified identifier: Browser-OS-DeviceType
 */
function getDeviceFingerprint(userAgent?: string): string {
  if (!userAgent || userAgent === 'Unknown') return 'unknown';
  
  const ua = userAgent.toLowerCase();
  
  // Detect browser
  let browser = 'unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'chrome';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'safari';
  else if (ua.includes('edg')) browser = 'edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'opera';
  
  // Detect OS
  let os = 'unknown';
  if (ua.includes('windows')) os = 'windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macos';
  else if (ua.includes('linux')) os = 'linux';
  else if (ua.includes('android')) os = 'android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'ios';
  
  // Detect device type
  let deviceType = 'desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) deviceType = 'mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) deviceType = 'tablet';
  
  return `${browser}-${os}-${deviceType}`;
}

/**
 * Check if two locations are significantly different
 * Returns true if different countries or very far apart
 */
function isLocationSignificantlyDifferent(loc1?: string, loc2?: string): boolean {
  if (!loc1 || !loc2 || loc1 === 'Unknown' || loc2 === 'Unknown') return false;
  
  // If locations are exactly the same, not different
  if (loc1 === loc2) return false;
  
  // Extract country from location (format: "City, Country" or just "Country")
  const getCountry = (loc: string): string => {
    const parts = loc.split(',').map(p => p.trim());
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  };
  
  const country1 = getCountry(loc1);
  const country2 = getCountry(loc2);
  
  // Different countries = significantly different
  if (country1 !== country2) return true;
  
  // Same country but different city = might be different, but less suspicious
  // We'll let the device check handle this
  return false;
}

/**
 * Detect and notify about suspicious login attempts
 * Only flags truly suspicious logins, not normal VPN/mobile network changes
 * @param loginActivityId - The ID of the login activity record to mark as suspicious
 */
export async function detectAndNotifySuspiciousLogin(
  employeeId: string,
  ipAddress?: string,
  location?: string,
  userAgent?: string,
  loginActivityId?: string
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) return;

    // Get recent successful logins to compare (last 60 days for better context)
    const recentLogins = await prisma.loginActivity.findMany({
      where: {
        employeeId,
        success: true,
        loginAt: {
          gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Last 60 days
        },
      },
      orderBy: {
        loginAt: 'desc',
      },
      take: 20, // Check more logins for better pattern recognition
    });

    if (recentLogins.length === 0) {
      // First login ever - not suspicious
      return;
    }

    // Get device fingerprint for current login
    const currentDeviceFingerprint = getDeviceFingerprint(userAgent);
    
    // Check if this device has been used before (trusted device)
    const hasUsedThisDevice = recentLogins.some(login => 
      getDeviceFingerprint(login.userAgent || undefined) === currentDeviceFingerprint
    );

    // Check if we've sent a suspicious login alert recently (cooldown - don't spam)
    const recentSuspiciousAlerts = await prisma.loginActivity.findMany({
      where: {
        employeeId,
        success: true,
        loginAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        // We'll check if location changed significantly in recent logins
      },
      orderBy: {
        loginAt: 'desc',
      },
      take: 5,
    });

    // If we've had multiple location changes in last 24h, user might be traveling - don't spam
    const recentLocations = recentSuspiciousAlerts
      .map(l => l.location)
      .filter((l): l is string => l !== null && l !== 'Unknown');
    const uniqueRecentLocations = new Set(recentLocations);
    if (uniqueRecentLocations.size >= 3) {
      // User is traveling - don't flag as suspicious
      return;
    }

    // Analyze suspicious patterns
    let isSuspicious = false;
    let suspiciousReason = '';
    let previousLocation = null;
    let previousDevice = null;

    // Get the most recent login
    const lastLogin = recentLogins[0];
    const lastDeviceFingerprint = getDeviceFingerprint(lastLogin.userAgent || undefined);
    const locationChanged = isLocationSignificantlyDifferent(location, lastLogin.location || undefined);
    const deviceChanged = currentDeviceFingerprint !== lastDeviceFingerprint;

    // Suspicious scenarios:
    // 1. Different device + different country (new device in new country)
    if (deviceChanged && locationChanged) {
      isSuspicious = true;
      suspiciousReason = 'New device detected from a different location';
      previousLocation = lastLogin.location || undefined;
      previousDevice = lastLogin.userAgent || undefined;
    }
    // 2. Same device but different country (device moved to new country - could be stolen)
    else if (!deviceChanged && locationChanged && !hasUsedThisDevice) {
      // Only flag if this device hasn't been used from multiple locations before
      // (if it has, user might just travel with this device)
      const locationsForThisDevice = recentLogins
        .filter(l => getDeviceFingerprint(l.userAgent || undefined) === currentDeviceFingerprint)
        .map(l => l.location)
        .filter((l): l is string => l !== null && l !== 'Unknown');
      const uniqueLocationsForDevice = new Set(locationsForThisDevice);
      
      // If device has been used from many locations, user travels with it - not suspicious
      if (uniqueLocationsForDevice.size < 3) {
        isSuspicious = true;
        suspiciousReason = 'Your device accessed from a different location';
        previousLocation = lastLogin.location || undefined;
      }
    }
    // 3. Different device from same location (less suspicious, but still worth noting if device never used before)
    else if (deviceChanged && !locationChanged && !hasUsedThisDevice) {
      // Only flag if this is a completely new device type (e.g., mobile -> desktop)
      const currentDeviceType = currentDeviceFingerprint.split('-')[2];
      const lastDeviceType = lastDeviceFingerprint.split('-')[2];
      
      if (currentDeviceType !== lastDeviceType) {
        isSuspicious = true;
        suspiciousReason = 'New device type detected';
        previousDevice = lastLogin.userAgent || undefined;
      }
    }

    // Don't flag if:
    // - Same device, same location (normal)
    // - Same device, different IP but same location (VPN/mobile network - normal)
    // - Device has been used before from this location (trusted)
    // - User is clearly traveling (multiple locations recently)

    if (isSuspicious) {
      // Mark the login as suspicious in the database
      if (loginActivityId) {
        await prisma.loginActivity.update({
          where: { id: loginActivityId },
          data: { suspicious: true },
        });
      }

      const loginTime = new Date().toLocaleString();
      const { subject, html } = emailTemplates.suspiciousLogin(
        employee.name,
        loginTime,
        ipAddress || 'Unknown',
        location || 'Unknown',
        userAgent || 'Unknown',
        previousLocation || undefined
      );

      // Send email to the user
      await sendEmail({
        to: employee.email,
        subject,
        html,
      });

      // Send email to all admins
      const admins = await prisma.employee.findMany({
        where: {
          role: 'ADMIN',
        },
        select: {
          email: true,
          name: true,
        },
      });

      // Send admin alert email to each admin
      for (const admin of admins) {
        const adminSubject = `🚨 Suspicious Login Alert: ${employee.name}`;
        const adminHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc3545;">Suspicious Login Detected</h2>
            <p>Hello ${admin.name},</p>
            <p>A suspicious login was detected for employee <strong>${employee.name}</strong> (${employee.email}).</p>
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Reason:</strong> ${suspiciousReason}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${loginTime}</p>
              <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ipAddress || 'Unknown'}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> ${location || 'Unknown'}</p>
              ${previousLocation ? `<p style="margin: 5px 0;"><strong>Previous Location:</strong> ${previousLocation}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Device:</strong> ${userAgent || 'Unknown'}</p>
            </div>
            <p style="color: #666; font-size: 14px;">This login has been flagged and saved in the security logs for review.</p>
          </div>
        `;

        await sendEmail({
          to: admin.email,
          subject: adminSubject,
          html: adminHtml,
        }).catch(err => {
          // Don't fail if admin email fails
          console.error(`Failed to send suspicious login alert to admin ${admin.email}:`, err);
        });
      }
    }
  } catch (error) {
    logError(error, { employeeId, context: 'detectAndNotifySuspiciousLogin' });
  }
}

/**
 * Send calendar event invitation emails to attendees
 */
export async function notifyCalendarEventInvitation(eventId: string) {
  try {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
        attendees: {
          include: {
            employee: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!event || !event.attendees.length) return;

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const eventUrl = `${baseUrl}/dashboard/calendar`;

    const startDate = new Date(event.startDate).toLocaleString();
    const endDate = new Date(event.endDate).toLocaleString();

    const { subject, html } = emailTemplates.calendarEventInvitation(
      event.title,
      event.createdBy.name,
      startDate,
      endDate,
      event.location,
      event.description,
      eventUrl
    );

    // Send to all attendees
    for (const attendee of event.attendees) {
      await sendEmail({
        to: attendee.employee.email,
        subject,
        html,
      });
    }
  } catch (error) {
    logError(error, { eventId, context: 'notifyCalendarEventInvitation' });
  }
}

/**
 * Send calendar event reminder emails
 */
export async function notifyCalendarEventReminder(eventId: string, minutesBefore: number) {
  try {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        attendees: {
          include: {
            employee: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!event) return;

    const startDate = new Date(event.startDate).toLocaleString();
    const { subject, html } = emailTemplates.calendarEventReminder(
      event.title,
      startDate,
      event.location,
      minutesBefore
    );

    // Send to creator and all attendees
    const recipients = [
      ...event.attendees.map(a => a.employee.email),
    ];

    // Add creator if not already in attendees
    const creator = await prisma.employee.findUnique({
      where: { id: event.createdById },
      select: { email: true },
    });

    if (creator && !recipients.includes(creator.email)) {
      recipients.push(creator.email);
    }

    for (const email of recipients) {
      await sendEmail({
        to: email,
        subject,
        html,
      });
    }
  } catch (error) {
    logError(error, { eventId, context: 'notifyCalendarEventReminder' });
  }
}

/**
 * Send new message notification
 */
export async function notifyNewMessage(messageId: string) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            name: true,
          },
        },
        recipient: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!message || !message.recipientId) return;

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const messageUrl = `${baseUrl}/dashboard/messages?recipientId=${message.senderId}`;

    // Get message preview (first 100 chars)
    const preview = message.content.length > 100 
      ? message.content.substring(0, 100) + '...'
      : message.content;

    const { subject, html } = emailTemplates.newMessage(
      message.sender.name,
      preview,
      messageUrl
    );

    await sendEmail({
      to: message.recipient.email,
      subject,
      html,
    });
  } catch (error) {
    logError(error, { messageId, context: 'notifyNewMessage' });
  }
} 