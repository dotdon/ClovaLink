'use client';

import { Container } from 'react-bootstrap';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

export default function TermsOfServicePage() {
  return (
    <div className="terms-page">
      <Container className="py-5">
        <Link href="/dashboard" className="back-link">
          <FaArrowLeft /> Back to Dashboard
        </Link>

        <div className="content-card">
          <h1>Terms of Service</h1>
          <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using ClovaLink, you accept and agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              ClovaLink provides secure document management and collaboration services for organizations. 
              Our platform enables users to:
            </p>
            <ul>
              <li>Upload, store, and organize documents</li>
              <li>Manage employee access and permissions</li>
              <li>Generate secure upload links</li>
              <li>Track document activities and audit logs</li>
              <li>Collaborate on documents within your organization</li>
            </ul>
          </section>

          <section>
            <h2>3. User Accounts</h2>
            <p>
              To use ClovaLink, you must create an account. You are responsible for:
            </p>
            <ul>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring your account information is accurate and up-to-date</li>
              <li>Complying with password and security requirements</li>
            </ul>
          </section>

          <section>
            <h2>4. Acceptable Use Policy</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Upload illegal, harmful, or infringing content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Use the service for any unlawful purpose</li>
              <li>Share your account credentials with unauthorized users</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Upload viruses, malware, or malicious code</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2>5. Content Ownership and Rights</h2>
            <p>
              You retain all rights to the content you upload to ClovaLink. By uploading content, you grant us 
              a license to store, process, and display your content solely for the purpose of providing our services.
            </p>
            <p>
              You are responsible for ensuring you have the necessary rights to upload and share any content 
              on our platform.
            </p>
          </section>

          <section>
            <h2>6. Data Security and Backup</h2>
            <p>
              While we implement robust security measures and regular backups, we recommend maintaining your own 
              backup copies of important documents. We are not liable for data loss due to:
            </p>
            <ul>
              <li>User error or accidental deletion</li>
              <li>Force majeure events</li>
              <li>Third-party service failures</li>
              <li>Cyber attacks or security breaches</li>
            </ul>
          </section>

          <section>
            <h2>7. Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted service. We may 
              temporarily suspend service for maintenance, updates, or emergency repairs. We will provide 
              advance notice when possible.
            </p>
          </section>

          <section>
            <h2>8. Subscription and Payment</h2>
            <p>
              Service fees and subscription terms will be clearly communicated. You agree to:
            </p>
            <ul>
              <li>Pay all applicable fees on time</li>
              <li>Provide accurate billing information</li>
              <li>Notify us of any billing disputes within 30 days</li>
            </ul>
            <p>
              We reserve the right to modify pricing with 30 days notice to existing customers.
            </p>
          </section>

          <section>
            <h2>9. Termination</h2>
            <p>
              We may suspend or terminate your account if you violate these terms. You may terminate your 
              account at any time by contacting us. Upon termination:
            </p>
            <ul>
              <li>Your access to the service will be revoked</li>
              <li>You must request data export within 30 days</li>
              <li>We may delete your data after the retention period</li>
            </ul>
          </section>

          <section>
            <h2>10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, ClovaLink shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, including loss of profits, data, 
              or business opportunities.
            </p>
          </section>

          <section>
            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify and hold ClovaLink harmless from any claims, damages, or expenses 
              arising from your use of the service or violation of these terms.
            </p>
          </section>

          <section>
            <h2>12. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of significant 
              changes via email or in-app notification. Continued use of the service after changes constitutes 
              acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2>13. Governing Law</h2>
            <p>
              These terms are governed by and construed in accordance with applicable laws. Any disputes 
              shall be resolved through binding arbitration.
            </p>
          </section>

          <section>
            <h2>14. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us:
            </p>
            <ul>
              <li>Email: <a href="mailto:legal@clovalink.com">legal@clovalink.com</a></li>
              <li>Support: <a href="mailto:support@clovalink.com">support@clovalink.com</a></li>
            </ul>
          </section>

          <section>
            <h2>15. Severability</h2>
            <p>
              If any provision of these terms is found to be unenforceable, the remaining provisions 
              will continue in full force and effect.
            </p>
          </section>
        </div>
      </Container>

      <style jsx>{`
        .terms-page {
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

