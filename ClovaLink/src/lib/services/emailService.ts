import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: EmailOptions) {
  try {
    const result = await transporter.sendMail({
      from: from || process.env.SMTP_FROM,
      to,
      subject,
      html,
    });
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

// Email templates
export const emailTemplates = {
  documentUploaded: (documentName: string, uploaderName: string) => ({
    subject: `New Document Uploaded: ${documentName}`,
    html: `
      <h2>New Document Upload Notification</h2>
      <p>A new document has been uploaded to your company's secure document portal.</p>
      <p><strong>Document:</strong> ${documentName}</p>
      <p><strong>Uploaded by:</strong> ${uploaderName}</p>
      <p>You can view this document by logging into the portal.</p>
    `,
  }),

  documentShared: (documentName: string, sharerName: string, linkUrl: string, expiryDate: Date) => ({
    subject: `Document Shared: ${documentName}`,
    html: `
      <h2>Document Share Notification</h2>
      <p>${sharerName} has shared a document with you.</p>
      <p><strong>Document:</strong> ${documentName}</p>
      <p>You can access the document using the secure link below:</p>
      <p><a href="${linkUrl}">Access Document</a></p>
      <p><strong>Link expires:</strong> ${expiryDate.toLocaleString()}</p>
      <p>This is a secure link. Please do not share it with others.</p>
    `,
  }),

  documentExpiringSoon: (documentName: string, expiryDate: Date) => ({
    subject: `Document Expiring Soon: ${documentName}`,
    html: `
      <h2>Document Expiration Notice</h2>
      <p>This is a reminder that the following document will expire soon:</p>
      <p><strong>Document:</strong> ${documentName}</p>
      <p><strong>Expiry Date:</strong> ${expiryDate.toLocaleString()}</p>
      <p>Please take any necessary actions before the document expires.</p>
    `,
  }),

  uploadLinkCreated: (creatorName: string, linkUrl: string, expiryDate: Date) => ({
    subject: 'New Secure Upload Link',
    html: `
      <h2>Secure Upload Link</h2>
      <p>${creatorName} has created a secure upload link for you.</p>
      <p>You can use this link to securely upload documents:</p>
      <p><a href="${linkUrl}">Upload Documents</a></p>
      <p><strong>Link expires:</strong> ${expiryDate.toLocaleString()}</p>
      <p>This is a secure link. Please do not share it with others.</p>
    `,
  }),
};

// Notification functions
export async function notifyDocumentUpload(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      uploadedBy: true,
      company: {
        include: {
          employees: {
            where: {
              role: 'ADMIN',
            },
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!document) return;

  const { subject, html } = emailTemplates.documentUploaded(
    document.name,
    document.uploadedBy.name
  );

  // Notify company admins
  for (const admin of document.company.employees) {
    await sendEmail({
      to: admin.email,
      subject,
      html,
    });
  }
}

export async function notifyExpiringDocuments() {
  const soon = new Date();
  soon.setDate(soon.getDate() + 7); // 7 days from now

  const expiringDocuments = await prisma.document.findMany({
    where: {
      expiresAt: {
        gte: new Date(),
        lte: soon,
      },
    },
    include: {
      company: {
        include: {
          employees: {
            where: {
              role: 'ADMIN',
            },
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  for (const document of expiringDocuments) {
    if (!document.expiresAt) continue;

    const { subject, html } = emailTemplates.documentExpiringSoon(
      document.name,
      document.expiresAt
    );

    // Notify company admins
    for (const admin of document.company.employees) {
      await sendEmail({
        to: admin.email,
        subject,
        html,
      });
    }
  }
} 