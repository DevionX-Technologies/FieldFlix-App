import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './recordingActiveScreen.css'

const ACCENT = '#4ade80'

type LocationState = {
  plannedDurationSec?: number
  scanned?: string
  venueName?: string
  venueAddress?: string
} | null

function formatHMS(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

const STEP_SEC = 5 * 60

/** Recording in progress — countdown, progress ring, Pause / Finish. */
export default function RecordingActiveScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState

  const planned = Math.max(60, state?.plannedDurationSec ?? 60 * 60)
  const scanned = state?.scanned?.trim() || ''
  const venueName = state?.venueName?.trim() || 'TGS Sports Arena'
  const venueAddress = state?.venueAddress?.trim() || 'Andheri West, Mumbai'

  const [remainingSec, setRemainingSec] = useState(planned)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => {
      setRemainingSec((r) => (r <= 0 ? 0 : r - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [paused])

  const progress = useMemo(() => {
    if (planned <= 0) return 0
    return Math.min(1, Math.max(0, (planned - remainingSec) / planned))
  }, [planned, remainingSec])

  const displayTime = useMemo(() => formatHMS(remainingSec), [remainingSec])

  const bump = useCallback((delta: number) => {
    setRemainingSec((r) => Math.min(planned, Math.max(0, r + delta)))
  }, [planned])

  const onFinish = () => {
    navigate('/recordings', {
      replace: true,
      state: {
        scanned: scanned || undefined,
        venueName,
        venueAddress,
        finished: true,
        recordedSec: planned - remainingSec,
      },
    })
  }

  return (
    <div className="ra-page">
      <button type="button" className="ra-back" onClick={() => navigate(-1)} aria-label="Go back">
        <BackIcon />
      </button>

      <div className="ra-scroll">
        <div className="ra-card">
          <div className="ra-location">
            <span className="ra-location__pin" aria-hidden>
              <PinIcon />
            </span>
            <div className="ra-location__text">
              <p className="ra-location__name">{venueName}</p>
              <p className="ra-location__addr">{venueAddress}</p>
              {scanned ? (
                <p className="ra-location__qr" title={scanned}>
                  {scanned.length > 40 ? `${scanned.slice(0, 37)}…` : scanned}
                </p>
              ) : null}
            </div>
          </div>

          <div className="ra-court" aria-hidden>
            <GridIcon />
            <span>Court 1</span>
          </div>

          <div className="ra-timer-row">
            <button type="button" className="ra-step" onClick={() => bump(-STEP_SEC)} aria-label="Decrease remaining time">
              <span>−</span>
            </button>

            <div className="ra-dial-wrap">
              <svg className="ra-dial-svg" viewBox="0 0 180 180" aria-hidden>
                <circle className="ra-dial-track" cx="90" cy="90" r="78" fill="none" strokeWidth="10" />
                <circle
                  className="ra-dial-progress"
                  cx="90"
                  cy="90"
                  r="78"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  transform="rotate(-90 90 90)"
                  strokeDasharray={2 * Math.PI * 78}
                  strokeDashoffset={2 * Math.PI * 78 * (1 - progress)}
                />
              </svg>
              <div className="ra-dial-center">
                <span className="ra-dial__time">{displayTime}</span>
                <div className="ra-recording-pill">
                  <span className="ra-recording-pill__dot" />
                  <span>Recording</span>
                </div>
              </div>
            </div>

            <button type="button" className="ra-step" onClick={() => bump(STEP_SEC)} aria-label="Increase remaining time">
              <span>+</span>
            </button>
          </div>

          <div className="ra-actions">
            <button type="button" className="ra-btn ra-btn--pause" onClick={() => setPaused((p) => !p)}>
              {paused ? <PlaySmIcon /> : <PauseIcon />}
              <span>{paused ? 'Resume' : 'Pause'}</span>
            </button>
            <button type="button" className="ra-btn ra-btn--finish" onClick={onFinish}>
              <StopIcon />
              <span>Finish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BackIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill={ACCENT}
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
      />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  )
}

function PlaySmIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7-11-7z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}
