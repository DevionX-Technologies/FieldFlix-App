import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import accountTypeBg from '../../Playsport_images/image16.jpeg'

type AccountType = 'public' | 'private'

const ACCENT = '#39d353'
const ACCENT_SOFT = '#22c55e'

export default function AccountTypeScreen() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<AccountType>('public')

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <img
        src={accountTypeBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: 'center 28%' }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,8,24,0.55) 0%, rgba(0,0,0,0.2) 38%, rgba(0,0,0,0.4) 62%, rgba(0,0,0,0.88) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse 95% 50% at 50% 22%, rgba(57,211,83,0.14) 0%, transparent 58%)',
        }}
      />

      {/*
        One compact column, vertically centered as a unit — avoids grid 1fr + centered cards,
        which creates huge empty bands above/below the cards. Same card markup & dimensions.
      */}
      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-y-auto">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-7">
          <div className="flex w-full max-w-[420px] flex-col items-center gap-8">
            <img
              src="/fieldflix_word_logo.jpeg"
              alt="FieldFlicks"
              className="h-14 w-auto max-w-full object-contain object-center sm:h-[60px]"
            />
            <div className="text-center">
              <h1
                className="text-[26px] font-bold leading-snug tracking-tight text-white sm:text-[28px]"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Choose your account type
              </h1>
              <p className="mt-2 text-[14px] font-normal sm:text-[15px]" style={{ color: '#e5e5e5' }}>
                Select your preference
              </p>
            </div>
            <div className="flex w-full gap-4">
              <AccountCard
                variant="public"
                selected={selected === 'public'}
                onClick={() => setSelected('public')}
              />
              <AccountCard
                variant="private"
                selected={selected === 'private'}
                onClick={() => setSelected('private')}
              />
            </div>
            <div className="flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="w-full rounded-full text-[16px] font-bold text-white transition-transform active:scale-[0.98]"
                style={{
                  height: 54,
                  backgroundColor: ACCENT_SOFT,
                  boxShadow: `0 4px 24px ${ACCENT_SOFT}55`,
                }}
              >
                Continue
              </button>
              <p className="text-center text-[12px] leading-relaxed text-white/90">
                You can change this later in settings
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AccountCard({
  variant,
  selected,
  onClick,
}: {
  variant: 'public' | 'private'
  selected: boolean
  onClick: () => void
}) {
  const isPublic = variant === 'public'

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-0 flex-1 flex-col rounded-[40px] text-center transition-all duration-200 active:scale-[0.98]"
      style={{
        minHeight: 236,
        height: 236,
        backgroundColor: selected ? 'rgba(12, 32, 20, 0.58)' : 'rgba(12, 14, 18, 0.58)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: selected ? `2px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.2)',
        boxShadow: selected
          ? `0 0 0 1px ${ACCENT}33, 0 0 28px ${ACCENT}55, 0 0 52px ${ACCENT}20`
          : 'none',
      }}
    >
      {selected && (
        <div
          className="absolute right-3 top-3 flex h-[22px] w-[22px] items-center justify-center rounded-full"
          style={{
            backgroundColor: ACCENT,
            boxShadow: `0 0 12px ${ACCENT}`,
          }}
        >
          <svg className="text-white" width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Even vertical rhythm: icon — title — body (same gaps both cards) */}
      <div className="flex h-full min-h-0 flex-col items-center justify-center px-3 py-6">
        <div className="flex w-full max-w-[9.25rem] flex-col items-center gap-3">
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center">
            {isPublic ? (
              <svg
                width="42"
                height="42"
                fill="none"
                stroke={ACCENT}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            ) : (
              <svg
                width="42"
                height="42"
                fill="none"
                stroke="#9ca3af"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>

          <span
            className="text-[14px] font-bold leading-snug text-white sm:text-[15px]"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {isPublic ? 'Public Account' : 'Private Account'}
          </span>

          <p
            className="w-full text-[11px] leading-[1.45] text-balance"
            style={{ color: '#c8c8c8' }}
          >
            {isPublic
              ? 'Anyone can view your highlights and profile'
              : 'This content can be accessed by you and all shared members'}
          </p>
        </div>
      </div>
    </button>
  )
}
