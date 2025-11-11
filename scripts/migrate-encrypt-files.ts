/**
 * Migration Script: Encrypt Existing Unencrypted Documents
 * 
 * This script encrypts all existing unencrypted files in the uploads directory
 * and updates their database records with encryption metadata.
 * 
 * IMPORTANT: 
 * - Make a backup of your uploads folder before running this script
 * - Ensure ENCRYPTION_KEY is set in your environment
 * - This script can be safely run multiple times (it skips already encrypted files)
 */

import prisma from '../src/lib/prisma';
import { encryptFile } from '../src/lib/documentEncryption';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

async function migrateEncryptFiles() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     ClovaLink File Encryption Migration                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Check if encryption key is set
  if (!process.env.ENCRYPTION_KEY) {
    console.error('❌ ERROR: ENCRYPTION_KEY environment variable is not set!');
    console.error('   Please set the ENCRYPTION_KEY before running this migration.\n');
    process.exit(1);
  }

  console.log('🔍 Finding unencrypted documents...\n');

  // Find all documents that are not encrypted
  const unencryptedDocuments = await prisma.document.findMany({
    where: {
      isEncrypted: false
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (unencryptedDocuments.length === 0) {
    console.log('✅ No unencrypted documents found. All files are already encrypted!\n');
    return;
  }

  console.log(`📦 Found ${unencryptedDocuments.length} unencrypted document(s)\n`);
  console.log('⚙️  Starting encryption process...\n');

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const document of unencryptedDocuments) {
    const filePath = join(UPLOAD_DIR, document.path);

    try {
      // Check if file exists
      if (!existsSync(filePath)) {
        console.log(`⚠️  [${document.id}] File not found: ${document.path} (skipping)`);
        skippedCount++;
        continue;
      }

      console.log(`🔐 [${successCount + 1}/${unencryptedDocuments.length}] Encrypting: ${document.name} (Company: ${document.companyId})`);

      // Read the original file
      const fileBuffer = await readFile(filePath);

      // Encrypt the file with company-specific key
      const { encryptedBuffer, encryptionMetadata } = encryptFile(fileBuffer, document.companyId);

      // Save the encrypted file (overwrite original)
      await writeFile(filePath, encryptedBuffer);

      // Update database record with encryption metadata
      await prisma.document.update({
        where: { id: document.id },
        data: {
          isEncrypted: true,
          encryptionIv: encryptionMetadata.iv,
          encryptionAuthTag: encryptionMetadata.authTag,
          encryptionSalt: encryptionMetadata.salt,
          encryptionAlgorithm: encryptionMetadata.algorithm
        }
      });

      console.log(`   ✅ Encrypted: ${document.name} (${document.size} bytes) with company key`);
      successCount++;

    } catch (error) {
      console.error(`   ❌ Error encrypting ${document.name}:`, error);
      errorCount++;
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    Migration Summary                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Successfully encrypted: ${successCount} file(s)`);
  console.log(`❌ Errors: ${errorCount} file(s)`);
  console.log(`⚠️  Skipped: ${skippedCount} file(s)`);
  console.log(`📊 Total processed: ${successCount + errorCount + skippedCount} file(s)\n`);

  if (errorCount > 0) {
    console.log('⚠️  Some files failed to encrypt. Please check the errors above.\n');
    process.exit(1);
  } else {
    console.log('🎉 Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   - All new uploads will be automatically encrypted');
    console.log('   - All downloads will be automatically decrypted');
    console.log('   - Keep your ENCRYPTION_KEY safe and backed up!\n');
  }
}

// Run the migration
migrateEncryptFiles()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

