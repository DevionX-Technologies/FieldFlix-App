import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import qrImg from '../assets/qr.png'
import sessionsCardBg from '../../Playsport_images/image7.jpg'
import { BottomNavFlickShortsIcon, BottomNavRecordingsIcon } from '../components/bottomNavRasterIcons'

/**
 * Layout from notifications/project-92fa6201 index.css (.frame-5, .rectangle-4, etc.).
 * Percentage insets so content stays aligned when card width is constrained.
 */
const BG = '#020617'
const ACCENT = '#22C55E'

const R = 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2026-04-10'

const BACK_ARROW = `${R}/XHJRSR0WCk.png`

/** 21px / 372px — right inset for play + Completed (reference absolute positions) */
const CARD_PAD_X_PCT = (21 / 372) * 100

type SessionRow = {
  id: string
  sport: string
  arena: string
  area: string
  when: string
  sportIcon: string
  pinIcon: string
  clockIcon: string
  playIcon: string | null
}

const SESSIONS: SessionRow[] = [
  {
    id: '1',
    sport: 'Pickleball',
    arena: 'TGS Sports Arena, Andheri West',
    area: 'Santacruz West, Mumbai',
    when: 'Feb 27, 2026 | 04:57 PM',
    sportIcon: `${R}/F2Lt6xWdi4.png`,
    pinIcon: `${R}/t2o4G2tzSv.png`,
    clockIcon: `${R}/tnWa17XveT.png`,
    playIcon: `${R}/gtK2TDyjSo.png`,
  },
  {
    id: '2',
    sport: 'Badminton',
    arena: 'TGS Sports Arena, Andheri West',
    area: 'Andheri East, Mumbai',
    when: 'Mar 02, 2026 | 06:30 PM',
    sportIcon: `${R}/OHBi5zuOmG.png`,
    pinIcon: `${R}/NbcnZyGYv1.png`,
    clockIcon: `${R}/ce0n5YNSD8.png`,
    playIcon: `${R}/Qjf1YVynD2.png`,
  },
  {
    id: '3',
    sport: 'Tennis',
    arena: 'TGS Sports Arena, Andheri West',
    area: 'Andheri East, Mumbai',
    when: 'Feb 28, 2026 | 05:45 PM',
    sportIcon: `${R}/hWoQXm2kLA.png`,
    pinIcon: `${R}/ZWvtyPjATt.png`,
    clockIcon: `${R}/wNsCgYFjcS.png`,
    playIcon: `${R}/Vsg7NtV7s1.png`,
  },
  {
    id: '4',
    sport: 'Basketball',
    arena: 'TGS Sports Arena, Andheri West',
    area: 'Lower Parel, Mumbai',
    when: 'Mar 01, 2026 | 09:00 PM',
    sportIcon: `${R}/KR42zCQtxK.png`,
    pinIcon: `${R}/vyfo28eHf4.png`,
    clockIcon: `${R}/17bocFiqGA.png`,
    playIcon: `${R}/KfNznH0mpg.png`,
  },
  {
    id: '5',
    sport: 'Tennis',
    arena: 'TGS Sports Arena, Andheri West',
    area: 'Juhu, Mumbai',
    when: 'Mar 05, 2026 | 07:15 AM',
    sportIcon: `${R}/4bhCGySpjn.png`,
    pinIcon: `${R}/rVGXSijYd9.png`,
    clockIcon: `${R}/kBEDOT1bQD.png`,
    playIcon: null,
  },
]

const openSans = { fontFamily: '"Open Sans", system-ui, sans-serif' } as const

export default function SessionsScreen() {
  const navigate = useNavigate()

  return (
    <div
      className="relative flex h-full min-h-0 flex-col text-white"
      style={{ backgroundColor: BG, ...openSans }}
    >
      <main
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          paddingBottom: 'max(200px, calc(168px + env(safe-area-inset-bottom, 0px)))',
        }}
      >
        {/*
          Completed strip + cards are siblings in a flex column with gap — flex gap does not
          collapse (unlike margin), so space below the green line stays visible.
        */}
        <div className="flex flex-col px-[15px] pb-10">
          <header className="mt-[10px] flex items-center gap-[10px]">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="flex h-6 w-6 shrink-0 items-center justify-center p-0 outline-none ring-offset-2 ring-offset-[#020617] focus-visible:ring-2 focus-visible:ring-[#22C55E]"
              aria-label="Back to home"
            >
              <img src={BACK_ARROW} alt="" width={24} height={24} className="h-6 w-6 object-cover" draggable={false} />
            </button>
            <h1
              className="h-[27px] whitespace-nowrap text-[20px] font-bold leading-[27px] text-white"
              style={{ fontWeight: 700 }}
            >
              Sessions
            </h1>
          </header>

          <div className="mt-[30px] flex flex-col gap-10">
            <div className="w-full border-b-2 border-[#22C55E] pb-[10px]">
              <p
                className="text-center text-[15px] font-semibold leading-5 text-white"
                style={{ fontWeight: 600 }}
              >
                Completed Sessions
              </p>
            </div>

            <div className="flex w-full flex-col items-center gap-[30px]">
              {SESSIONS.map((s) => (
                <SessionCard key={s.id} row={s} />
              ))}
            </div>
          </div>
        </div>
      </main>

      <nav
        className="absolute bottom-0 left-0 right-0 z-30 rounded-t-[24px] border border-white/10 border-b-0 bg-[#0a1014]/95 pt-3 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}
        aria-label="Main navigation"
      >
        <div className="grid grid-cols-5 items-end justify-items-center px-1 pb-1">
          <BottomNavItem label="Home" onClick={() => navigate('/home')} icon={<HomeIcon />} />
          <BottomNavItem label="Sessions" active icon={<SessionsIcon active />} />
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

function SessionCard({ row }: { row: SessionRow }) {
  return (
    <article className="relative mx-auto box-border h-[165px] w-full max-w-[372px] overflow-hidden rounded-[20px]">
      <img
        src={sessionsCardBg}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {/*
        .frame-5: top 11.52%, left 5.11%, width 66.4%, height 75.76%, gap 12px, align-items flex-start
        Arena: use justify-start (reference .frame-a used justify-center which offset text from the icon column)
      */}
      <div
        className="absolute z-[1] box-border flex flex-col items-start gap-[12px]"
        style={{
          top: '11.52%',
          left: '5.11%',
          width: '66.4%',
          height: '75.76%',
        }}
      >
        {/* .frame-6 — row height 42px; icon .frame-7 reference was 45×42 rounded — we use 42 circle */}
        <div className="flex h-[42px] w-full shrink-0 items-center gap-[11px]">
          <div
            className="box-border flex size-[42px] shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(34, 197, 94, 0.25)' }}
          >
            <img src={row.sportIcon} alt="" width={24} height={24} className="h-6 w-6 object-contain" draggable={false} />
          </div>
          <span
            className="h-[27px] shrink-0 whitespace-nowrap text-[20px] leading-[27px] text-white"
            style={{ fontWeight: 600 }}
          >
            {row.sport}
          </span>
        </div>

        {/* .tgs-sports-arena — h 22px */}
        <div className="flex h-[22px] w-full min-w-0 shrink-0 items-center justify-start">
          <span className="min-w-0 truncate text-left text-[16px] leading-[21.789px] text-white" style={{ fontWeight: 600 }}>
            {row.arena}
          </span>
        </div>

        {/* .frame-b: 163×37, gap 5px */}
        <div className="flex h-[37px] w-[163px] max-w-full shrink-0 flex-col justify-center gap-[5px]">
          <div className="flex items-center gap-[5px]">
            <img src={row.pinIcon} alt="" width={15} height={15} className="size-[15px] shrink-0 object-cover" draggable={false} />
            <span className="h-4 min-w-0 truncate text-left text-[12px] leading-4 text-[#94a3b8]" style={{ fontWeight: 600 }}>
              {row.area}
            </span>
          </div>
          <div className="flex items-center gap-[5px]">
            <img src={row.clockIcon} alt="" width={15} height={15} className="size-[15px] shrink-0 object-cover" draggable={false} />
            <span className="h-4 whitespace-nowrap text-left text-[12px] leading-4 text-[#94a3b8]" style={{ fontWeight: 600 }}>
              {row.when}
            </span>
          </div>
        </div>
      </div>

      {/* .frame-12 — top 19px ≡ 11.52%; right 21px; share/play icon */}
      {row.playIcon ? (
        <button
          type="button"
          className="absolute z-[2] box-border flex h-[42px] w-[45px] items-center justify-center rounded-[20px] pt-[9px] pr-[10px] pb-[9px] pl-[11px] outline-none ring-offset-2 ring-offset-transparent focus-visible:ring-2 focus-visible:ring-[#22C55E]"
          style={{ top: '11.52%', right: `${CARD_PAD_X_PCT}%` }}
          aria-label="Share or play session"
        >
          <img src={row.playIcon} alt="" width={24} height={24} className="h-6 w-6 object-contain" draggable={false} />
        </button>
      ) : null}

      {/* .frame-14 — top 115px + height 29 → bottom 21px from card bottom */}
      <div
        className="absolute z-[2] box-border flex h-[29px] w-[94px] items-center justify-center rounded-[20px] px-[10px] py-[5px]"
        style={{
          bottom: `${(21 / 165) * 100}%`,
          right: `${CARD_PAD_X_PCT}%`,
          background: 'rgba(34, 197, 94, 0.25)',
        }}
      >
        <span className="h-[19px] whitespace-nowrap text-[14px] leading-[19px] text-[#22C55E]" style={{ fontWeight: 600 }}>
          Completed
        </span>
      </div>
    </article>
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
      <span className={`flex h-11 w-11 items-center justify-center rounded-full ${active ? 'bg-[#14532d]/95' : ''}`}>
        {icon}
      </span>
      <span className="max-w-[72px] text-center">{label}</span>
    </button>
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
      className={active ? 'h-7 w-7 text-[#22C55E]' : 'h-7 w-7 text-white/65'}
      fill="none"
      stroke="currentColor"
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

