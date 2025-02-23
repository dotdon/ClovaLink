import { FaExclamationTriangle } from 'react-icons/fa';
import styles from './styles.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <FaExclamationTriangle size={64} className={styles.warningIcon} />
        <h1 className={styles.title}>
          Download Link Not Found
        </h1>
        <p className={styles.subtitle}>
          The download link you're trying to access doesn't exist or has been removed.
        </p>
        <div className={styles.buttonContainer}>
          <a href="/" className={styles.downloadButton}>
            Go to Homepage
          </a>
        </div>
      </div>
    </div>
  );
} 