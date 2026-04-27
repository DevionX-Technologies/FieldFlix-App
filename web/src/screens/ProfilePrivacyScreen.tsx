import { useNavigate } from 'react-router-dom'
import { P } from './profileSubScreensAssets'
import './profilePrivacyScreen.css'

export default function ProfilePrivacyScreen() {
  const navigate = useNavigate()

  return (
    <div className="pp-page">
      <header className="pp-head">
        <button type="button" className="pp-back" onClick={() => navigate(-1)} aria-label="Go back">
          <img src={P.privacyBack} alt="" width={24} height={24} draggable={false} />
        </button>
        <h1 className="pp-title">Privacy & Policy</h1>
      </header>

      <main className="pp-scroll">
        <section className="pp-section">
          <div className="pp-section-title">
            <img src={P.privacyLock} alt="" width={24} height={24} draggable={false} />
            <h2>Privacy</h2>
          </div>
          <div className="pp-copy">
            <p>
              We take your privacy seriously and are committed to safeguarding your personal information. The data we collect is used responsibly to enhance our services and provide a personalized experience while
              using the app.
            </p>
            <p>
              We collect only the necessary information, such as your name, activity within the app, and usage patterns. This data helps us improve our features, optimize performance, and deliver content that is
              relevant to you.
            </p>
            <p>
              Your information is protected using advanced security measures to prevent unauthorized access or misuse. You can access, update, or request the deletion of your data at any time through your account
              settings.
            </p>
          </div>
        </section>

        <div className="pp-divider" aria-hidden />

        <section className="pp-section">
          <div className="pp-policy-head">
            <img src={P.privacyPolicy} alt="" width={20} height={20} draggable={false} />
            <h2>Policy</h2>
          </div>
          <div className="pp-copy">
            <p>
              By using our app, you agree to follow our terms and conditions, ensuring that the platform is used responsibly and in accordance with applicable guidelines.
            </p>
            <p>We do not sell, rent, or misuse your personal data.</p>
            <p>
              Trusted third-party services may be utilized to support certain features, each of which adhere to strict privacy and security standards.
            </p>
            <p>
              Our policy may be updated periodically to reflect changes in legislation or for security enhancements. We encourage you to review this page from time to time to stay informed about how we protect your
              personal information.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
