import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import heroImg from '../../Playsport_images/image8.jpeg'
import arenaImg from '../../Playsport_images/image9.jpg'
import qrImg from '../assets/qr.png'
import camButtonImg from '../assets/cam-button.png'
import pickleballImg from '../assets/pickleball.png'
import padelImg from '../assets/padel.png'
import fieldflixLogo from '../assets/fieldflix_logo.png'
import activityImg from '../assets/Activity.png'
import recentSessionIcon from '../assets/recentsession.png'
import comingSoonImg from '../assets/coming-soon.png'
import autoHighlightBannerImg from '../assets/autohiglhight.png'
import notificationIcon from '../assets/notification.png'
import profileHeaderIcon from '../assets/Profile icon.png'
import { BottomNavFlickShortsIcon, BottomNavRecordingsIcon } from '../components/bottomNavRasterIcons'

/**
 * HOME SCREEN — element index (top → bottom, left → right)
 * =============================================================================
 * [1]  Root shell — dark bg #050A0E, column layout, scroll main + fixed nav
 *
 * SCROLLABLE MAIN
 * ---------------
 * [2]  Header row
 * [2a] Brand mark — fieldflix_logo.png (left)
 * [2b] Location block (center)
 * [2b-i]   Label “Your Location” — muted small text
 * [2b-ii]  Value “Mumbai, India” — bold white
 * [2c] Header actions (right)
 * [2c-i]   Notifications — notification.png (asset includes badge)
 * [2c-ii]  Profile — Profile icon.png
 *
 * [3]  Hero card — “Elevate your game / Start recording” (uses image8.jpeg)
 * [3a] Background image — full-bleed inside rounded card
 * [3b] Gradient overlay — readability over photo
 * [3c] Headline — absolute top (pt-* moves copy only); pill — absolute bottom
 * [3c-i]   “Elevate Your” — white, bold
 * [3c-ii]  “Game Today” — large bold, green L→R gradient (clip text)
 * [3c-iii] Description — two lines, small white
 * [3d] Bottom pill CTA — white capsule inside same column (not overlay-only)
 * [3d-i]   Left — cam-button.png (inset inside pill)
 * [3d-ii]  Center — “Start Recording” bold; “Tap to capture your game” muted
 * [3d-iii] Right — light circle + dark chevron
 *
 * [4]  Sports category strip — horizontal scroll
 * [4a] (no section title — horizontal sport tiles)
 * [4b] Category card — white TL/BR inset; green outer glow when selected
 * [4c] Category card — Padel
 * [4d] Category card — Cricket: coming-soon.png badge → label
 *
 * [5]  Arena carousel — horizontal scroll, rich cards (no “Arenas” title)
 * [5b] Recent Sessions — vertical list, “View all”
 *
 * STICKY / FIXED BOTTOM BAR (non-scrollable)
 * -----------------------------------------
 * [6]  Bottom navigation — fixed to bottom of phone shell, opaque bar
 * [6a] Nav item — Home (active): green house in dark pill, label “Home”
 * [6b] Nav item — Sessions: video camera outline, label “Sessions”
 * [6c] Center FAB — large elevated neon-green circle, qr.png asset
 * [6d] Nav item — FlickShorts: Flickshorts.png, label “FlickShorts”
 * [6e] Nav item — Recordings: Recordings.png, label “Recordings”
 */

const BG = '#050A0E'
/** Matches `NotificationsScreen` accent */
const NOTIFICATION_GREEN = '#22C55E'
const ACCENT = NOTIFICATION_GREEN

const ARENA_CARDS = [
  {
    id: 'a1',
    name: 'TSG Arena',
    location: 'Andheri West',
    status: 'Indoor • Available Now',
    rating: 4.5,
    distanceKm: 1.2,
    pricePerHr: 200,
  },
  {
    id: 'a2',
    name: 'Velocity Padel Mumbai',
    location: 'Bandra East',
    status: 'Indoor • Available Now',
    rating: 4.8,
    distanceKm: 2.1,
    pricePerHr: 350,
  },
  {
    id: 'a3',
    name: 'Greenline Pickleball Hub',
    location: 'Powai',
    status: 'Outdoor • Available Now',
    rating: 4.6,
    distanceKm: 3.4,
    pricePerHr: 250,
  },
  {
    id: 'a4',
    name: 'Urban Court Padel',
    location: 'Lower Parel',
    status: 'Indoor • Opens 6 PM',
    rating: 4.3,
    distanceKm: 0.8,
    pricePerHr: 400,
  },
  {
    id: 'a5',
    name: 'Rally Point Pickleball',
    location: 'Juhu',
    status: 'Indoor • Available Now',
    rating: 4.7,
    distanceKm: 4.2,
    pricePerHr: 280,
  },
  {
    id: 'a6',
    name: 'Coastal Padel Club',
    location: 'Worli',
    status: 'Rooftop • Available Now',
    rating: 4.4,
    distanceKm: 2.6,
    pricePerHr: 320,
  },
] as const

const RECENT_SESSIONS = [
  {
    id: 's1',
    arenaName: 'TSG Arena',
    location: 'Santacruz West',
    timeLabel: 'Today at 04:57 PM',
    thumbTime: '15:00',
    score: 23,
  },
  {
    id: 's2',
    arenaName: 'Velocity Padel Mumbai',
    location: 'Bandra East',
    timeLabel: 'Yesterday at 06:30 PM',
    thumbTime: '18:00',
    score: 18,
  },
  {
    id: 's3',
    arenaName: 'Greenline Pickleball Hub',
    location: 'Powai',
    timeLabel: 'Mon at 07:15 AM',
    thumbTime: '07:00',
    score: 31,
  },
  {
    id: 's4',
    arenaName: 'Urban Court Padel',
    location: 'Lower Parel',
    timeLabel: 'Sun at 05:00 PM',
    thumbTime: '17:00',
    score: 12,
  },
  {
    id: 's5',
    arenaName: 'Rally Point Pickleball',
    location: 'Juhu',
    timeLabel: 'Sat at 11:20 AM',
    thumbTime: '11:00',
    score: 27,
  },
] as const

export default function HomeScreen() {
  const navigate = useNavigate()
  const [sport, setSport] = useState<'pickleball' | 'padel' | 'cricket'>('pickleball')

  return (
    <div
      className="relative flex h-full min-h-0 flex-col font-sans text-white"
      style={{ backgroundColor: BG }}
    >
      <main
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          paddingBottom: 'max(200px, calc(168px + env(safe-area-inset-bottom, 0px)))',
        }}
      >
        {/* [2] Header — full-width breathing room, divider */}
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 pb-6 pt-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center" aria-hidden>
              <img src={fieldflixLogo} alt="" className="h-10 w-10 object-contain" draggable={false} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium tracking-wide text-white/50">Your Location</p>
              <p className="truncate text-[18px] font-bold leading-tight tracking-tight text-white">Mumbai, India</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4 pl-1">
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl p-0 outline-none ring-offset-2 ring-offset-[#050A0E] focus-visible:ring-2 focus-visible:ring-[#22C55E]"
              aria-label="Notifications"
            >
              <span className="flex h-6 w-6 items-center justify-center">
                <img src={notificationIcon} alt="" className="max-h-6 max-w-6 object-contain object-center" draggable={false} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl p-0 outline-none ring-offset-2 ring-offset-[#050A0E] focus-visible:ring-2 focus-visible:ring-[#22C55E]"
              aria-label="Profile"
            >
              <span className="flex h-6 w-6 items-center justify-center">
                <img src={profileHeaderIcon} alt="" className="max-h-6 max-w-6 object-contain object-center" draggable={false} />
              </span>
            </button>
          </div>
        </header>

        {/* [3] Hero — pt-12: padding (not margin) so gap below header border stays visible; no collapse */}
        <section className="px-5 pt-12">
          <div className="relative min-h-[320px] overflow-hidden rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.45)] sm:min-h-[340px]">
            <img
              src={heroImg}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: 'center 22%' }}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/92 via-black/35 to-black/50"
              aria-hidden
            />
            {/* Fill card (inset-0) so headline/pill position vs real top/bottom — not a collapsing relative box */}
            <div className="absolute inset-0 z-10">
              <div className="absolute left-0 right-0 top-[40px] z-20 box-border pl-5 pr-3 sm:top-[40px] sm:pl-6 sm:pr-4">
                <div className="min-w-0 max-w-[min(100%,320px)] translate-x-[23px] sm:translate-x-[29px]">
                  <p className="text-[18px] font-bold leading-snug text-white sm:text-[19px]">Elevate Your</p>
                  <p className="mt-2 text-[32px] font-extrabold leading-[1.12] tracking-tight sm:text-[36px]">
                    <span className="bg-gradient-to-r from-[#86efac] via-[#22C55E] to-[#166534] bg-clip-text text-transparent">
                      Game Today
                    </span>
                  </p>
                  <p className="mt-4 max-w-[290px] text-[14px] leading-[1.5] text-white">
                    Capture your best moments and track your improvement over time
                  </p>
                </div>
              </div>
              <div className="absolute bottom-[55px] left-0 right-0 z-20 flex justify-center px-3 sm:bottom-[59px] sm:px-4">
                <button
                  type="button"
                  onClick={() => navigate('/scan')}
                  className="flex w-full max-w-[328px] cursor-pointer items-center gap-1.5 rounded-full border-none bg-white py-4 pl-3 pr-3 text-left shadow-[0_8px_28px_rgba(0,0,0,0.18)] outline-none ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-neutral-400 sm:max-w-[340px] sm:gap-2 sm:py-[18px] sm:pl-3.5 sm:pr-3.5"
                  aria-label="Start recording"
                >
                  <img
                    src={camButtonImg}
                    alt=""
                    className="ml-2 h-11 w-11 shrink-0 select-none object-contain sm:ml-3 sm:h-12 sm:w-12"
                    draggable={false}
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[15px] font-bold leading-tight text-neutral-950">Start Recording</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-neutral-500">Tap to capture your game</p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 sm:h-12 sm:w-12">
                    <ChevronRightIcon className="h-5 w-5 text-neutral-900 sm:h-6 sm:w-6" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Sports → Arenas → Recent: vertical rhythm only here (flex gap), not inside cards/lists */}
        <div className="mt-4 flex flex-col gap-7">
          {/* [4] Sport tiles — single horizontal row */}
          <section>
            <div className="flex gap-4 overflow-x-auto px-5 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <SportCard
                label="Pickleball"
                selected={sport === 'pickleball'}
                onClick={() => setSport('pickleball')}
                icon={<img src={pickleballImg} alt="" className="h-[52px] w-[52px] object-contain" draggable={false} />}
              />
              <SportCard
                label="Padel"
                selected={sport === 'padel'}
                onClick={() => setSport('padel')}
                icon={<img src={padelImg} alt="" className="h-[52px] w-[52px] object-contain" draggable={false} />}
              />
              <SportCard
                label="Cricket"
                selected={sport === 'cricket'}
                onClick={() => setSport('cricket')}
                comingSoon
              />
            </div>
          </section>

          {/* [5] Arena carousel — no section title; horizontal scroll */}
          <section>
            <div className="flex gap-4 overflow-x-auto px-5 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ARENA_CARDS.map((arena) => (
                <article
                  key={arena.id}
                  className="w-[280px] shrink-0 overflow-hidden rounded-[20px] border border-white/[0.1] bg-[#0B1019] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                >
                  <img src={arenaImg} alt="" className="h-[140px] w-full object-cover" />
                  <div
                    className="box-border w-full space-y-2 text-left"
                    style={{ padding: '16px 22px 22px 22px' }}
                  >
                    <h3 className="text-[16px] font-bold leading-snug text-white">{arena.name}</h3>
                    <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                      <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      <span>{arena.location}</span>
                    </div>
                    <p className="text-[12px] text-slate-500">{arena.status}</p>
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-0.5">
                        <StarIcon className="h-3 w-3 text-amber-400" />
                        {arena.rating}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span>{arena.distanceKm} km</span>
                      <span className="text-slate-600">•</span>
                      <span>₹{arena.pricePerHr}/hr</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Recent Sessions — thumbnails use same image as hero */}
          <section className="px-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={recentSessionIcon}
                  alt=""
                  className="h-7 w-7 shrink-0 object-contain"
                  draggable={false}
                />
                <h2 className="text-[17px] font-semibold tracking-tight text-white">Recent Sessions</h2>
              </div>
              <button
                type="button"
                className="shrink-0 text-[13px] font-medium text-[#22C55E] outline-none focus-visible:underline"
              >
                View all &gt;
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {RECENT_SESSIONS.map((session) => (
                <div
                  key={session.id}
                  className="flex gap-3 rounded-2xl border border-white/[0.08] bg-[#0c1218] p-3 shadow-sm"
                >
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-black/40">
                    <img
                      src={heroImg}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ objectPosition: 'center 22%' }}
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
                      {session.thumbTime}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="text-[14px] font-bold leading-tight text-white">{session.arenaName}</p>
                    <div className="mt-1 flex items-center gap-1 text-[12px] text-white/55">
                      <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
                      <span className="truncate">{session.location}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[12px] text-white/45">
                      <ClockIcon className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
                      <span>{session.timeLabel}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col justify-center">
                    <div className="flex items-center gap-1 rounded-lg border border-[#166534]/50 bg-[#14532d]/70 px-2 py-1.5">
                      <TrophyIcon className="h-4 w-4 text-[#22C55E]" />
                      <span className="text-[15px] font-bold tabular-nums text-[#22C55E]">{session.score}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Auto Highlight — single banner asset */}
          <section className="px-5 pb-8">
            <img
              src={autoHighlightBannerImg}
              alt=""
              className="w-full rounded-[22px] border border-white/[0.1] object-cover shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
              draggable={false}
            />
          </section>
        </div>
      </main>

      {/* [6] Bottom nav — fixed inside phone frame */}
      <nav
        className="absolute bottom-0 left-0 right-0 z-30 rounded-t-[24px] border border-white/10 border-b-0 bg-[#0a1014]/95 pt-3 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}
        aria-label="Main navigation"
      >
        <div className="grid grid-cols-5 items-end justify-items-center px-1 pb-1">
          <BottomNavItem label="Home" active icon={<HomeIcon active />} />
          <BottomNavItem label="Sessions" onClick={() => navigate('/sessions')} icon={<SessionsIcon />} />
          <div className="flex w-full flex-col items-center pb-0.5">
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="relative -top-5 flex h-[60px] w-[60px] items-center justify-center rounded-full shadow-[0_8px_28px_rgba(34,197,94,0.45)] outline-none ring-offset-2 ring-offset-[#0a1014] focus-visible:ring-2 focus-visible:ring-[#22C55E]"
              style={{ backgroundColor: ACCENT }}
              aria-label="Scan QR code"
            >
              <img src={qrImg} alt="" className="h-8 w-8 object-contain" />
            </button>
          </div>
          <BottomNavItem label="FlickShorts" onClick={() => navigate('/flixshorts')} icon={<BottomNavFlickShortsIcon />} smallLabel />
          <BottomNavItem label="Recordings" onClick={() => navigate('/recordings')} icon={<BottomNavRecordingsIcon />} />
        </div>
      </nav>
    </div>
  )
}

/** White highlight at top-left + bottom-right (upper-right & lower-left “vanish”). Green is outer glow only when selected. */
function sportTileShellClass(selected: boolean, comingSoon: boolean): string {
  const whiteCorners =
    'shadow-[inset_1.5px_1.5px_0_0_rgba(255,255,255,0.24),inset_-1.5px_-1.5px_0_0_rgba(255,255,255,0.16)]'
  if (selected && !comingSoon) {
    /* Outer glow kept smaller than flex gap so neighbours don’t visually merge */
    return `bg-[#0a1510] ${whiteCorners} shadow-[inset_1.5px_1.5px_0_0_rgba(255,255,255,0.24),inset_-1.5px_-1.5px_0_0_rgba(255,255,255,0.16),0_0_22px_rgba(34,197,94,0.55)]`
  }
  return `bg-white/[0.06] ${whiteCorners}`
}

function SportCard({
  label,
  selected,
  onClick,
  comingSoon,
  icon,
}: {
  label: string
  selected: boolean
  onClick: () => void
  comingSoon?: boolean
  icon?: ReactNode
}) {
  const shell = sportTileShellClass(selected, !!comingSoon)

  const activity = (
    <img src={activityImg} alt="" className="h-[14px] w-auto shrink-0 object-contain" draggable={false} />
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-[128px] w-[128px] shrink-0 flex-col overflow-visible rounded-[20px] transition-[box-shadow,background-color] duration-200 ${shell}`}
    >
      {comingSoon ? (
        <div className="relative flex min-h-0 flex-1 flex-col items-stretch px-1.5 pb-2 pt-2">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1 pt-2">
            <img
              src={comingSoonImg}
              alt=""
              className="max-h-[72px] w-[min(100%,112px)] object-contain object-center"
              draggable={false}
            />
          </div>
          <div className="flex w-full shrink-0 items-center justify-center gap-1.5 px-1 opacity-90">
            <span className="text-[13px] font-semibold text-white">{label}</span>
            {activity}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-stretch justify-start pt-3">
          <div className="flex flex-1 items-center justify-center">{icon}</div>
          <div className="flex w-full shrink-0 items-center justify-center gap-1.5 px-2.5 pb-2">
            <span className="text-[13px] font-semibold text-white">{label}</span>
            {activity}
          </div>
        </div>
      )}
    </button>
  )
}

function BottomNavItem({
  label,
  icon,
  active,
  smallLabel,
  onClick,
}: {
  label: string
  icon: ReactNode
  active?: boolean
  smallLabel?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex max-w-[76px] flex-col items-center gap-1 pb-1 pt-1 font-medium leading-tight ${
        active ? 'text-white' : 'text-white/50'
      } ${smallLabel ? 'text-[9px]' : 'text-[11px]'}`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          active ? 'bg-[#14532d]/95' : ''
        }`}
      >
        {icon}
      </span>
      <span className="max-w-[72px] text-center">{label}</span>
    </button>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v6l3 2" />
    </svg>
  )
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 21h8M12 17v4M7 4h10v3a5 5 0 01-10 0V4zM17 4h2a2 2 0 012 2v1a2 2 0 01-2 2h-2M7 4H5a2 2 0 00-2 2v1a2 2 0 002 2h2"
      />
    </svg>
  )
}

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg
      className={active ? 'h-7 w-7 text-[#22C55E]' : 'h-7 w-7 text-white/65'}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" />
    </svg>
  )
}

function SessionsIcon() {
  return (
    <svg className="h-7 w-7 text-white/65" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  )
}

