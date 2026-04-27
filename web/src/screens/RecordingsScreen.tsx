import { useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import arenaImg from '../../Playsport_images/image9.jpg'
import qrImg from '../assets/qr.png'
import { BottomNavFlickShortsIcon, BottomNavRecordingsIcon } from '../components/bottomNavRasterIcons'
import './recordingsScreen.css'

/** Asset URLs from find-rec/App.tsx (Codia export) */
const R = 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2026-04-10'
const REC = {
  headLogo: `${R}/8nUSurFHdn.png`,
  headFilter: `${R}/PXvRMHzfHX.png`,
  tabMy: `${R}/TbTaW1Ro3W.png`,
  tabShared: `${R}/yOJhKqe3A9.png`,
  tabFind: `${R}/Oi0v71GwpY.png`,
  hero: `${R}/EO0qkhh7nb.png`,
  gameFinderIcon: `${R}/2t2SExUfZY.png`,
  stepLoc: `${R}/Y1EBnyaVyH.png`,
  stepSched: `${R}/JohXWwKStO.png`,
  stepVerify: `${R}/521ZVFV8hc.png`,
  locLabel: `${R}/8Q2NfiDUwj.png`,
  groundIcon: `${R}/vzApzDsDgu.png`,
  dateIcon: `${R}/SA8RjJ9pLH.png`,
  startIcon: `${R}/NSAsaVrBUV.png`,
  endIcon: `${R}/3Lovij8Dnb.png`,
  ctaIcon: `${R}/hvgBZLMjTh.png`,
  verifyIcon: `${R}/tEqgjHGu0r.png`,
} as const

const ACCENT = '#22C55E'

type TabId = 'my' | 'shared' | 'find'

const MY_RECORDINGS = [
  {
    id: 'm1',
    title: 'TSG Sports Arena | Santacruz West',
    location: 'Santacruz West, Mumbai',
    when: 'Feb 27, 2026 | 04:57 PM',
    duration: '00:18',
    highlights: 40,
    tags: ['#1', '#2', '#3'],
    moreTags: 37,
  },
  {
    id: 'm2',
    title: 'Velocity Padel Mumbai',
    location: 'Bandra East, Mumbai',
    when: 'Feb 26, 2026 | 06:30 PM',
    duration: '00:42',
    highlights: 18,
    tags: ['#1', '#2'],
    moreTags: 12,
  },
  {
    id: 'm3',
    title: 'Greenline Pickleball Hub',
    location: 'Powai, Mumbai',
    when: 'Feb 25, 2026 | 07:15 AM',
    duration: '01:05',
    highlights: undefined,
    tags: ['#4', '#5'],
    moreTags: 8,
  },
] as const

const SHARED_RECORDINGS = [
  { id: 's1', title: 'Recordings #8116', highlights: 45, shareWith: 100 },
  { id: 's2', title: 'Recordings #8092', highlights: 12, shareWith: 24 },
] as const

export default function RecordingsScreen() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [tab, setTab] = useState<TabId>('my')

  const [findLocation, setFindLocation] = useState('Santacruz Playfield, Santacruz West, Mumbai')
  const [findGround, setFindGround] = useState('ground 10')
  const [findDate, setFindDate] = useState('Feb 27, 2026')
  const [findStart, setFindStart] = useState('01:30 PM')
  const [findEnd, setFindEnd] = useState('03:00 PM')
  const [findPhone, setFindPhone] = useState('')

  return (
    <div className="rec-page">
      <header className="rec-head">
        <div className="rec-head__left">
          <button type="button" className="rec-head__logo-btn" onClick={() => navigate('/home')} aria-label="Back to home">
            <img src={REC.headLogo} alt="" width={24} height={24} draggable={false} />
          </button>
          <h1 className="rec-head__title">Recordings</h1>
        </div>
        <button type="button" className="rec-head__action" aria-label="Filter">
          <img src={REC.headFilter} alt="" width={24} height={24} draggable={false} />
        </button>
      </header>

      <div className="rec-seg-outer">
        <div className="rec-seg" role="tablist" aria-label="Recording views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'my'}
            className={`rec-seg__tab ${tab === 'my' ? 'rec-seg__tab--active' : ''}`}
            onClick={() => setTab('my')}
          >
            <img src={REC.tabMy} alt="" width={24} height={24} draggable={false} />
            <span>My Recordings</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'shared'}
            className={`rec-seg__tab ${tab === 'shared' ? 'rec-seg__tab--active' : ''}`}
            onClick={() => setTab('shared')}
          >
            <img src={REC.tabShared} alt="" width={24} height={24} draggable={false} />
            <span>Shared Recordings</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'find'}
            className={`rec-seg__tab ${tab === 'find' ? 'rec-seg__tab--active' : ''}`}
            onClick={() => setTab('find')}
          >
            <img src={REC.tabFind} alt="" width={24} height={24} draggable={false} />
            <span>Find Recordings</span>
          </button>
        </div>
      </div>

      <main className="rec-main">
        <div className="rec-body">
          {tab === 'my' && (
            <div className="rec-my-list">
              {MY_RECORDINGS.map((row) => (
                <article key={row.id} className="rec-my-row">
                  <div className="rec-my-thumb-wrap">
                    <span className="rec-my-bar" aria-hidden />
                    <span className="rec-my-accent">{row.duration}</span>
                    <button type="button" className="rec-my-share" aria-label="Share recording">
                      <ShareSmallIcon className="h-4 w-4" />
                    </button>
                    <img src={arenaImg} alt="" />
                    <div className="rec-my-play-overlay">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-lg text-[#0a0a0a]">
                        <PlayTriangleIcon className="h-5 w-5 translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                  <div className="rec-my-body">
                    <p className="rec-my-title">{row.title}</p>
                    <div className="rec-my-line">
                      <MapPinIcon className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />
                      <span className="truncate">{row.location}</span>
                    </div>
                    <div className="rec-my-line" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      <CalendarIcon className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />
                      <span>{row.when}</span>
                    </div>
                    {row.highlights != null && (
                      <div className="rec-my-line" style={{ color: ACCENT, fontWeight: 600 }}>
                        <TrophyIcon className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />
                        <span>{row.highlights} Highlights</span>
                      </div>
                    )}
                    <div className="rec-my-tags">
                      {row.tags.map((t) => (
                        <span key={t} className="rec-tag">
                          {t}
                        </span>
                      ))}
                      <span className="rec-tag rec-tag--more">+{row.moreTags}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {tab === 'shared' && (
            <div className="rec-shared-list">
              {SHARED_RECORDINGS.map((card) => (
                <article key={card.id} className="rec-shared-card">
                  <div className="rec-shared-media">
                    <img src={arenaImg} alt="" />
                  </div>
                  <div className="rec-shared-grad" aria-hidden />
                  <div className="rec-shared-overlay">
                    <div className="rec-shared-top">
                      <span className="rec-shared-ready">Ready</span>
                      <div className="rec-shared-dur">
                        <ClockIconSmall className="h-4 w-4 shrink-0" />
                        N/A
                      </div>
                    </div>
                    <div className="rec-shared-mid">
                      <p className="rec-shared-title">{card.title}</p>
                      <p className="rec-shared-meta">No location available</p>
                    </div>
                    <div className="rec-shared-actions">
                      <div className="rec-shared-pills">
                        <span className="rec-shared-pill">
                          <TrophyIcon className="h-[18px] w-[18px] shrink-0" style={{ color: ACCENT }} />
                          {card.highlights} Highlights
                        </span>
                        <span className="rec-shared-pill">Share with : {card.shareWith}</span>
                      </div>
                      <button type="button" className="rec-shared-fab" aria-label="Share">
                        <ShareGlyphIcon className="h-5 w-5 text-neutral-950" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {tab === 'find' && (
            <div className="rec-find">
              <section
                className="rec-find-hero"
                style={{
                  backgroundImage: `url(${REC.hero})`,
                }}
              >
                <div className="rec-find-hero-blob" aria-hidden />
                <div className="rec-find-hero__inner">
                  <div className="rec-find-badge">
                    <img src={REC.gameFinderIcon} alt="" width={20} height={20} draggable={false} />
                    <span>Game Finder</span>
                  </div>
                  <p className="rec-find-headline">
                    Missed your <em>game?</em>
                  </p>
                  <p className="rec-find-sub">Enter your match details and find your recording instantly.</p>
                </div>
                <div className="rec-find-deco" aria-hidden>
                  <div className="rec-find-play-ring">
                    <div className="rec-find-play-core">
                      <PlayTriangleIcon className="rec-find-play-icon" style={{ color: ACCENT }} />
                    </div>
                  </div>
                </div>
              </section>

              <div className="rec-find-steps">
                <div className="rec-find-step">
                  <img src={REC.stepLoc} alt="" draggable={false} />
                  Location
                </div>
                <div className="rec-find-step">
                  <img src={REC.stepSched} alt="" draggable={false} />
                  Schedule
                </div>
                <div className="rec-find-step rec-find-step--muted">
                  <img src={REC.stepVerify} alt="" draggable={false} />
                  Verify
                </div>
              </div>

              <section className="rec-find-panel">
                <div className="rec-find-label-row">
                  <img src={REC.locLabel} alt="" draggable={false} />
                  <span>Location</span>
                </div>
                <div className="rec-find-field">
                  <input value={findLocation} onChange={(e) => setFindLocation(e.target.value)} aria-label="Location" />
                </div>
              </section>

              <section className="rec-find-panel">
                <div className="rec-find-grid2">
                  <div>
                    <div className="rec-find-label-row">
                      <img src={REC.groundIcon} alt="" draggable={false} />
                      <span>Ground / Court no.</span>
                    </div>
                    <div className="rec-find-field">
                      <input value={findGround} onChange={(e) => setFindGround(e.target.value)} aria-label="Ground" />
                    </div>
                  </div>
                  <div>
                    <div className="rec-find-label-row">
                      <img src={REC.dateIcon} alt="" draggable={false} />
                      <span>Date</span>
                    </div>
                    <div className="rec-find-field">
                      <input value={findDate} onChange={(e) => setFindDate(e.target.value)} aria-label="Date" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rec-find-panel">
                <div className="rec-find-grid2">
                  <div>
                    <div className="rec-find-label-row">
                      <img src={REC.startIcon} alt="" draggable={false} />
                      <span>Start time</span>
                    </div>
                    <div className="rec-find-field">
                      <input value={findStart} onChange={(e) => setFindStart(e.target.value)} aria-label="Start time" />
                    </div>
                  </div>
                  <div>
                    <div className="rec-find-label-row">
                      <img src={REC.endIcon} alt="" draggable={false} />
                      <span>End time</span>
                    </div>
                    <div className="rec-find-field">
                      <input value={findEnd} onChange={(e) => setFindEnd(e.target.value)} aria-label="End time" />
                    </div>
                  </div>
                </div>
              </section>

              <button type="button" className="rec-find-cta">
                <img src={REC.ctaIcon} alt="" width={20} height={20} draggable={false} />
                Find My Game
              </button>

              <section className="rec-find-panel rec-find-panel--verify">
                <div className="rec-find-verify-title">
                  <img src={REC.verifyIcon} alt="" width={24} height={24} draggable={false} />
                  <strong>Verify access</strong>
                </div>
                <p className="rec-find-verify-hint">(Enter the mobile number of the player who started the recording)</p>
                <div className="rec-find-phone">
                  <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.9)' }}>
                    +91
                  </span>
                  <input
                    value={findPhone}
                    onChange={(e) => setFindPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    inputMode="numeric"
                    placeholder="Enter your mobile..."
                    aria-label="Mobile number"
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <nav
        className="rec-nav"
        style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom, 18px))' }}
        aria-label="Main navigation"
      >
        <div className="rec-nav__grid">
          <NavItem label="Home" onClick={() => navigate('/home')} icon={<HomeIcon />} />
          <NavItem
            label="Sessions"
            onClick={() => navigate('/sessions')}
            icon={<SessionsIcon active={pathname === '/sessions'} />}
            active={pathname === '/sessions'}
          />
          <div className="rec-nav__fab-wrap">
            <button
              type="button"
              className="rec-nav__fab"
              onClick={() => navigate('/scan')}
              aria-label="Scan QR code"
            >
              <img src={qrImg} alt="" className="h-8 w-8 object-contain" />
            </button>
          </div>
          <NavItem
            label="FlickShorts"
            onClick={() => navigate('/flixshorts')}
            icon={<BottomNavFlickShortsIcon />}
            smallLabel
          />
          <NavItem label="Recordings" active onClick={() => navigate('/recordings')} icon={<BottomNavRecordingsIcon />} accentGlow />
        </div>
      </nav>
    </div>
  )
}

function NavItem({
  label,
  icon,
  active,
  onClick,
  smallLabel,
  accentGlow,
}: {
  label: string
  icon: ReactNode
  active?: boolean
  onClick: () => void
  smallLabel?: boolean
  accentGlow?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rec-nav__item ${active ? 'rec-nav__item--active' : ''} ${smallLabel ? 'text-[9px]' : ''}`}
      style={{ gap: 6 }}
    >
      <span className={`rec-nav__icon-wrap ${active ? 'rec-nav__icon-wrap--on' : ''}`}>{icon}</span>
      <span className="max-w-[72px] text-center">{label}</span>
      {accentGlow && active && <span className="rec-nav__glow" aria-hidden />}
    </button>
  )
}

function ShareSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  )
}

function ShareGlyphIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2.25} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  )
}

function PlayTriangleIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function MapPinIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function CalendarIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M5 11h14M5 21h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function TrophyIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4M7 4h10v3a5 5 0 01-10 0V4zM17 4h2a2 2 0 012 2v1a2 2 0 01-2 2h-2M7 4H5a2 2 0 00-2 2v1a2 2 0 002 2h2" />
    </svg>
  )
}

function ClockIconSmall({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v6l3 2" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg className="h-7 w-7 text-white/65" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" />
    </svg>
  )
}

function SessionsIcon({ active }: { active?: boolean }) {
  return (
    <svg
      className={active ? 'h-7 w-7' : 'h-7 w-7 text-white/65'}
      fill="none"
      stroke={active ? ACCENT : 'currentColor'}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  )
}
