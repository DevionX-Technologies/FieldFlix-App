import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import './profileScreen.css'

/** Profile — built like premium: styles in `profileScreen.css`; routes unchanged. */
export default function ProfileScreen() {
  const navigate = useNavigate()

  return (
    <div className="profile-screen">
      <header className="profile-screen__header">
        <button
          type="button"
          className="profile-screen__back"
          onClick={() => navigate('/home')}
          aria-label="Back to home"
        >
          <BackIcon />
        </button>
        <h1 className="profile-screen__title">Profile</h1>
      </header>

      <main className="profile-screen__scroll">
        <div className="profile-screen__container">
          <section className="profile-card">
            <div className="profile-card__top">
              <div className="profile-card__avatar-wrap">
                <div className="profile-card__avatar">SS</div>
                <button type="button" className="profile-card__camera" aria-label="Change profile photo">
                  <CameraIcon />
                </button>
              </div>
              <div className="profile-card__meta">
                <p className="profile-card__name">Sanket Singh</p>
                <p className="profile-card__email">SanketSingh98.5@gmail.com</p>
                <span className="profile-card__pill">Pro Player</span>
              </div>
            </div>
            <div className="profile-card__stats">
              <div className="profile-stat">
                <p className="profile-stat__value">42</p>
                <p className="profile-stat__label">Sessions</p>
              </div>
              <div className="profile-stat">
                <p className="profile-stat__value profile-stat__value--accent">87</p>
                <p className="profile-stat__label">Flickshorts</p>
              </div>
              <div className="profile-stat">
                <p className="profile-stat__value">12</p>
                <p className="profile-stat__label">Shared</p>
              </div>
            </div>
          </section>

          <section className="profile-section">
            <div className="profile-section__head">
              <h2 className="profile-section__title">Personal Details</h2>
              <button type="button" className="profile-section__edit">
                Edit
              </button>
            </div>
            <div className="profile-details">
              <DetailRow icon={<PersonIcon />} label="Full Name" value="Sanket Singh" />
              <DetailRow icon={<PhoneIcon />} label="Mobile Number" value="+91 7298367165" />
              <DetailRow icon={<MailIcon />} label="Email Address" value="SanketSingh98.5@gmail.com" />
            </div>
            <p className="profile-about__heading">About Me</p>
            <AboutMeContent />
          </section>

          <section className="profile-section">
            <div className="profile-section__head">
              <h2 className="profile-section__title">Settings</h2>
            </div>
            <div className="profile-settings">
              <SettingsRow
                icon={<BellIcon />}
                title="Notifications"
                subtitle="Manage your alerts"
                onClick={() => navigate('/profile/notification-settings')}
              />
              <SettingsRow
                icon={<GearIcon />}
                title="App Settings"
                subtitle="Control your data"
                onClick={() => navigate('/profile/app-settings')}
              />
              <SettingsRow
                icon={<CrownIcon />}
                title="Premium"
                subtitle="Upgrade your plan"
                onClick={() => navigate('/profile/premium')}
              />
              <SettingsRow
                icon={<WalletIcon />}
                title="Payment History"
                subtitle="View all transactions."
                onClick={() => navigate('/profile/payment-history')}
              />
              <SettingsRow
                icon={<ShieldIcon />}
                title="Privacy & Policy"
                subtitle="Safe, secure, and transparent"
                onClick={() => navigate('/profile/privacy')}
              />
              <SettingsRow
                icon={<StarIcon />}
                title="Rate Us"
                subtitle="Share your feedback"
                onClick={() => navigate('/profile/rate-us')}
              />
            </div>
          </section>

          <div className="profile-help">
            <span className="profile-help__icon-wrap">
              <HelpIcon />
            </span>
            <span>Need help?</span>
            <button type="button" className="profile-help__link" onClick={() => navigate('/profile/contact-us')}>
              Contact Us
            </button>
          </div>

          <button type="button" className="profile-logout" onClick={() => navigate('/login')}>
            <LogoutIcon />
            Logout
          </button>

          <button type="button" className="profile-delete">
            <TrashIcon />
            Delete Account
          </button>
        </div>
      </main>
    </div>
  )
}

function AboutMeContent() {
  const lines = ['Playing Style: Fast, aggressive, tactical', 'Achievements: League winner, MVP']
  return (
    <div className="profile-about__box">
      <div className="profile-about__lines">
        {lines.map((line) => (
          <div key={line} className="profile-about__line">
            <span className="profile-about__bullet" aria-hidden />
            <p className="profile-about__text">{line}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="profile-field">
      <p className="profile-field__label">{label}</p>
      <div className="profile-field__row">
        <span className="profile-field__icon">{icon}</span>
        <p className="profile-field__value">{value}</p>
      </div>
    </div>
  )
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button type="button" className="profile-settings__btn" onClick={onClick}>
      <span className="profile-settings__icon">{icon}</span>
      <div className="profile-settings__text">
        <p className="profile-settings__title">{title}</p>
        <p className="profile-settings__subtitle">{subtitle}</p>
      </div>
      <span className="profile-settings__chev" aria-hidden>
        ›
      </span>
    </button>
  )
}

function BackIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 17h16M6 17V9l4 3 2-6 2 6 4-3v8" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}
