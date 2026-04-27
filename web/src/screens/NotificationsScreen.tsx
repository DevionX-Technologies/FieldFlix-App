import { useNavigate } from 'react-router-dom'

const BG = '#050A0E'
const CARD_BG = '#081020'
const ACCENT = '#22C55E'
const MUTED = '#a8b0bc'

/** PNG assets copied from repo root `notifications/` → served from `web/public/notifications/` */
const NOTIFICATION_ICONS = {
  trophy: '/notifications/trophy.png',
  chart: '/notifications/chart.png',
  video: '/notifications/video.png',
  whistle: '/notifications/whistle.png',
  bulb: '/notifications/bulb.png',
} as const

type IconId = keyof typeof NOTIFICATION_ICONS

type NotificationItem = {
  id: string
  title: string
  description: string
  time: string
  icon: IconId
}

const SECTIONS: { label: string; items: NotificationItem[] }[] = [
  {
    label: 'Today',
    items: [
      {
        id: 't1',
        title: 'Match Completed',
        description: 'Your cricket match session has been processed and is ready to view.',
        time: '2 hours ago',
        icon: 'trophy',
      },
      {
        id: 't2',
        title: 'Performance spike detected',
        description: 'Your serve speed improved 12% compared to your last five sessions.',
        time: '3 hours ago',
        icon: 'chart',
      },
      {
        id: 't3',
        title: 'Weekly Summary Ready',
        description: 'Check your performance insights and new personal bests this week.',
        time: '5 hours ago',
        icon: 'chart',
      },
      {
        id: 't4',
        title: 'Video Recording Available',
        description: 'Your match recording has been successfully uploaded.',
        time: '8 hours ago',
        icon: 'video',
      },
      {
        id: 't5',
        title: 'Highlight reel generated',
        description: 'We clipped your top rallies from today’s padel session.',
        time: '9 hours ago',
        icon: 'video',
      },
      {
        id: 't6',
        title: 'Coach left feedback',
        description: 'Review footwork notes from your last training block.',
        time: '11 hours ago',
        icon: 'whistle',
      },
    ],
  },
  {
    label: 'Yesterday',
    items: [
      {
        id: 'y1',
        title: 'Training Goal Achieved',
        description: "You reached your target in today's pickleball training session.",
        time: '1 day ago',
        icon: 'whistle',
      },
      {
        id: 'y2',
        title: 'New AI Insight Available',
        description: 'Get detailed analysis and smart suggestions from your last game.',
        time: '1 day ago',
        icon: 'bulb',
      },
      {
        id: 'y3',
        title: 'Squad match invite',
        description: 'You’ve been invited to a doubles ladder match this Saturday.',
        time: '1 day ago',
        icon: 'trophy',
      },
      {
        id: 'y4',
        title: 'Stats export ready',
        description: 'Your CSV export from last week is ready to download.',
        time: '1 day ago',
        icon: 'chart',
      },
    ],
  },
  {
    label: 'This week',
    items: [
      {
        id: 'w1',
        title: 'Monthly recap unlocked',
        description: 'See trends for shots, distance covered, and session count.',
        time: '3 days ago',
        icon: 'chart',
      },
      {
        id: 'w2',
        title: 'Storage almost full',
        description: 'Free up space or upgrade to keep new recordings.',
        time: '4 days ago',
        icon: 'video',
      },
      {
        id: 'w3',
        title: 'Tip: recovery drills',
        description: 'Short mobility sets after matches can reduce next-day soreness.',
        time: '5 days ago',
        icon: 'bulb',
      },
      {
        id: 'w4',
        title: 'Arena promotion',
        description: 'Book TSG Sports Arena this week and get 10% off peak slots.',
        time: '5 days ago',
        icon: 'trophy',
      },
      {
        id: 'w5',
        title: 'Drill streak milestone',
        description: 'Five coaching drills completed in a row—keep it going.',
        time: '6 days ago',
        icon: 'whistle',
      },
    ],
  },
  {
    label: 'Earlier',
    items: [
      {
        id: 'e1',
        title: 'Welcome to Fieldflix',
        description: 'Start recording, track progress, and unlock AI insights.',
        time: '2 weeks ago',
        icon: 'bulb',
      },
      {
        id: 'e2',
        title: 'Profile verified',
        description: 'Your athlete profile is now verified for league play.',
        time: '3 weeks ago',
        icon: 'trophy',
      },
      {
        id: 'e3',
        title: 'First session synced',
        description: 'Your wearable data is now connected to session summaries.',
        time: '3 weeks ago',
        icon: 'chart',
      },
    ],
  },
]

export default function NotificationsScreen() {
  const navigate = useNavigate()

  return (
    <div
      className="relative flex h-full min-h-0 flex-col font-sans text-white"
      style={{ backgroundColor: BG }}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.08] px-4 pb-4 pt-[max(12px,env(safe-area-inset-top,12px))]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white outline-none ring-offset-2 ring-offset-[#050A0E] focus-visible:ring-2 focus-visible:ring-[#22C55E]"
          aria-label="Go back"
        >
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[20px] font-bold tracking-tight">Notifications</h1>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-8 [-webkit-overflow-scrolling:touch] [scroll-behavior:smooth]">
        {SECTIONS.map((section, idx) => (
          <section key={section.label} className={idx === 0 ? 'pt-5' : 'mt-7'}>
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
              {section.label}
            </h2>
            <ul className="flex flex-col gap-2.5">
              {section.items.map((n) => (
                <NotificationCard key={n.id} item={n} />
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  )
}

function NotificationCard({ item }: { item: NotificationItem }) {
  const src = NOTIFICATION_ICONS[item.icon]
  const bulbAsset = item.icon === 'bulb'

  return (
    <li>
      <article
        className="flex gap-3 rounded-[14px] border border-white/[0.12] p-3.5"
        style={{ backgroundColor: CARD_BG }}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded-[10px] ${
            bulbAsset
              ? 'h-11 w-11 overflow-hidden border-0 bg-transparent p-0'
              : 'h-11 w-11 border border-white/[0.08] bg-black/30'
          }`}
          aria-hidden
        >
          <img
            src={src}
            alt=""
            className={
              bulbAsset
                ? 'h-full w-full object-cover'
                : 'h-8 w-8 object-contain [image-rendering:-webkit-optimize-contrast]'
            }
            draggable={false}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold leading-snug text-white">{item.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: MUTED }}>
            {item.description}
          </p>
          <p className="mt-2 text-[12px] font-medium" style={{ color: ACCENT }}>
            {item.time}
          </p>
        </div>
      </article>
    </li>
  )
}
