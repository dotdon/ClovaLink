import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { FaDownload, FaExclamationTriangle } from 'react-icons/fa';
import styles from './styles.module.css';

async function getDownloadLink(token: string) {
  const downloadLink = await prisma.downloadLink.findUnique({
    where: { token },
    include: {
      folder: true,
      document: true,
      createdBy: {
        select: {
          name: true,
          company: {
            select: { name: true }
          }
        }
      }
    }
  });

  return downloadLink;
}

export default async function DownloadPage({
  params
}: {
  params: { token: string }
}) {
  const downloadLink = await getDownloadLink(params.token);

  if (!downloadLink) {
    notFound();
  }

  const isExpired = new Date(downloadLink.expiresAt) < new Date();
  const isInactive = !downloadLink.isActive;

  const itemName = downloadLink.folder?.name || downloadLink.document?.name;
  const itemType = downloadLink.folder ? 'folder' : 'document';

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Download {itemType}
          </h1>
          <p className={styles.subtitle}>
            Shared by {downloadLink.createdBy.name} from {downloadLink.createdBy.company.name}
          </p>
        </div>

        {(isExpired || isInactive) ? (
          <div className={styles.errorMessage}>
            <FaExclamationTriangle size={48} className={styles.errorIcon} />
            <p className={styles.itemName}>
              {isExpired ? 'This download link has expired' : 'This download link is no longer active'}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.itemInfo}>
              <h2 className={styles.itemName}>{itemName}</h2>
              <p className={styles.expiryInfo}>
                This link will expire on {new Date(downloadLink.expiresAt).toLocaleDateString()}
              </p>
            </div>

            <div className={styles.buttonContainer}>
              <a
                href={`/api/download/${params.token}`}
                download
                className={styles.downloadButton}
              >
                <FaDownload className={styles.buttonIcon} />
                Download {itemType}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 