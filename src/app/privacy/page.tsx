import { Container } from 'react-bootstrap';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

// Force static generation
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

export default function PrivacyPolicyPage() {
  return (
    <div className="privacy-page">
      <Container className="py-5">
        <Link href="/dashboard" className="back-link">
          <FaArrowLeft /> Back to Dashboard
        </Link>

        <div className="content-card">
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2>1. Information We Collect</h2>
            <p>
              ClovaLink collects information necessary to provide secure document management services to your organization. 
              This includes:
            </p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, role, and authentication credentials</li>
              <li><strong>Document Data:</strong> Files uploaded, metadata, and access logs</li>
              <li><strong>Usage Information:</strong> Activity logs, login timestamps, and system interactions</li>
              <li><strong>Security Information:</strong> Two-factor authentication settings, passkeys, and security preferences</li>
            </ul>
          </section>

          <section>
            <h2>2. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul>
              <li>Provide and maintain document management services</li>
              <li>Authenticate users and maintain account security</li>
              <li>Generate activity reports and audit logs</li>
              <li>Improve our services and user experience</li>
              <li>Communicate important updates and notifications</li>
              <li>Comply with legal obligations and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2>3. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data:
            </p>
            <ul>
              <li>End-to-end encryption for data transmission</li>
              <li>Secure data storage with regular backups</li>
              <li>Multi-factor authentication support</li>
              <li>Role-based access controls</li>
              <li>Regular security audits and updates</li>
              <li>Compliance with data protection regulations</li>
            </ul>
          </section>

          <section>
            <h2>4. Data Retention</h2>
            <p>
              We retain your data for as long as your account remains active or as needed to provide services. 
              Documents and user data can be deleted upon request, subject to legal retention requirements.
            </p>
          </section>

          <section>
            <h2>5. Data Sharing</h2>
            <p>
              ClovaLink does not sell or share your personal information with third parties for marketing purposes. 
              We may share data only in the following circumstances:
            </p>
            <ul>
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With service providers under strict confidentiality agreements</li>
            </ul>
          </section>

          <section>
            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt-out of non-essential communications</li>
              <li>File a complaint with data protection authorities</li>
            </ul>
          </section>

          <section>
            <h2>7. Cookies and Tracking</h2>
            <p>
              We use essential cookies to maintain your session and provide core functionality. 
              We do not use third-party tracking cookies for advertising purposes.
            </p>
          </section>

          <section>
            <h2>8. Changes to This Policy</h2>
            <p>
              We may update this privacy policy periodically. We will notify users of significant changes 
              through email or in-app notifications.
            </p>
          </section>

          <section>
            <h2>9. Contact Us</h2>
            <p>
              If you have questions or concerns about this privacy policy or your data, please contact us:
            </p>
            <ul>
              <li>Email: <a href="mailto:privacy@clovalink.com">privacy@clovalink.com</a></li>
              <li>Support: <a href="mailto:support@clovalink.com">support@clovalink.com</a></li>
            </ul>
          </section>
        </div>
      </Container>

      <style jsx>{`
        .privacy-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0015 0%, #1a0033 50%, #2d1b4e 100%);
          color: white;
          padding-bottom: 2rem;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-size: 0.95rem;
          margin-bottom: 2rem;
          transition: all 0.3s ease;
        }

        .back-link:hover {
          color: #ffffff;
          transform: translateX(-4px);
        }

        .content-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 16px;
          padding: 2.5rem;
          max-width: 900px;
          margin: 0 auto;
        }

        @media (max-width: 767px) {
          .content-card {
            padding: 1.5rem;
          }
        }

        h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .last-updated {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
          margin-bottom: 2rem;
        }

        section {
          margin-bottom: 2rem;
        }

        h2 {
          color: #ffffff;
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
          margin-top: 1.5rem;
        }

        p {
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.7;
          margin-bottom: 1rem;
        }

        ul {
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.7;
          padding-left: 1.5rem;
        }

        li {
          margin-bottom: 0.5rem;
        }

        a {
          color: #667eea;
          text-decoration: none;
          transition: color 0.3s ease;
        }

        a:hover {
          color: #764ba2;
          text-decoration: underline;
        }

        strong {
          color: #ffffff;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

