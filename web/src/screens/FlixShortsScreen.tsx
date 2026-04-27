import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import img23 from '../../Playsport_images/images23.jpg'
import img21 from '../../Playsport_images/images21.jpg'
import img19 from '../../Playsport_images/images19.jpg'
import img18 from '../../Playsport_images/images18.jpg'

const REEL_IMAGES = [img23, img21, img19, img18] as const

/**
 * Full-screen vertical reels: snap scroll, placeholder images + pause overlay until real video is available.
 */
export default function FlixShortsScreen() {
  const navigate = useNavigate()
  const [liked, setLiked] = useState<Record<number, boolean>>({})
  const [subscribed, setSubscribed] = useState<Record<number, boolean>>({})

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/home')
  }

  const toggleLike = (i: number) => {
    setLiked((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  const toggleSubscribe = (i: number) => {
    setSubscribed((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  const shareReel = async (index: number) => {
    const url = `${window.location.origin}${window.location.pathname}#reel-${index}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FieldFlix', text: 'Check out this short', url })
        return
      }
    } catch {
      /* user cancelled or share failed */
    }
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <div
        className="h-full w-full snap-y snap-mandatory overflow-y-auto overflow-x-hidden"
        style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
      >
        {REEL_IMAGES.map((src, i) => (
          <article
            key={i}
            className="relative flex h-dvh w-full shrink-0 snap-start snap-always items-center justify-center bg-black"
          >
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
            <div className="pointer-events-none absolute inset-0 bg-black/10" aria-hidden />
            {/* Pause overlay — placeholder until video playback */}
            <div className="relative z-[1] flex h-20 w-20 items-center justify-center rounded-full bg-white/25 backdrop-blur-[2px]">
              <PauseIcon className="h-10 w-10 text-white drop-shadow-md" />
            </div>

            {/* Right rail — like, share, subscribe */}
            <div
              className="pointer-events-auto absolute bottom-[max(5rem,env(safe-area-inset-bottom,0px)+4rem)] right-0 z-[2] flex flex-col items-center gap-5 px-3"
              style={{ paddingRight: 'max(12px, env(safe-area-inset-right, 12px))' }}
            >
              <ReelActionButton
                label="Like"
                onClick={() => toggleLike(i)}
                active={!!liked[i]}
                icon={
                  liked[i] ? (
                    <HeartFilledIcon className="h-8 w-8 text-rose-500 drop-shadow" />
                  ) : (
                    <HeartOutlineIcon className="h-8 w-8 text-white drop-shadow" />
                  )
                }
              />
              <ReelActionButton
                label="Share"
                onClick={() => void shareReel(i)}
                icon={<ShareIcon className="h-8 w-8 text-white drop-shadow" />}
              />
              <ReelActionButton
                label={subscribed[i] ? 'Subscribed' : 'Subscribe'}
                onClick={() => toggleSubscribe(i)}
                active={!!subscribed[i]}
                narrowLabel
                icon={
                  subscribed[i] ? (
                    <CheckCircleIcon className="h-8 w-8 text-[#22C55E] drop-shadow" />
                  ) : (
                    <UserPlusIcon className="h-8 w-8 text-white drop-shadow" />
                  )
                }
              />
            </div>
          </article>
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}
      >
        <div className="pointer-events-auto px-3">
          <button
            type="button"
            onClick={goBack}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md outline-none transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="Go back"
          >
            <BackArrowIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  )
}

function ReelActionButton({
  label,
  onClick,
  icon,
  active,
  narrowLabel,
}: {
  label: string
  onClick: () => void
  icon: ReactNode
  active?: boolean
  narrowLabel?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      aria-pressed={active}
      aria-label={label}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 shadow-[0_2px_12px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-transform active:scale-95">
        {icon}
      </span>
      <span
        className={`max-w-[4.5rem] text-center text-[11px] font-semibold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${narrowLabel ? 'text-[10px]' : ''}`}
      >
        {label}
      </span>
    </button>
  )
}

function HeartOutlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  )
}

function HeartFilledIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  )
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
