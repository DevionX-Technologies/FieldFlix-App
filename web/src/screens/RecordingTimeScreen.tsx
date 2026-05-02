import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './recordingTimeScreen.css'

type LocationState = { scanned?: string; venueName?: string; venueAddress?: string } | null

const ACCENT = '#4ade80'

const PRESETS = [
  { id: '30', seconds: 30 * 60, top: '30', bottom: 'min' },
  { id: '60', seconds: 60 * 60, top: '1', bottom: 'hr' },
  { id: '90', seconds: 90 * 60, top: '1:30', bottom: 'hrs' },
  { id: '120', seconds: 120 * 60, top: '2', bottom: 'hrs' },
  { id: '150', seconds: 150 * 60, top: '2:30', bottom: 'hrs' },
  { id: '180', seconds: 180 * 60, top: '3', bottom: 'hrs' },
  { id: '210', seconds: 210 * 60, top: '3:30', bottom: 'hrs' },
  { id: '240', seconds: 240 * 60, top: '4', bottom: 'hrs' },
  { id: '270', seconds: 270 * 60, top: '4:30', bottom: 'hrs' },
  { id: '300', seconds: 300 * 60, top: '5', bottom: 'hrs' },
] as const

function formatHMS(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

const STEP_SEC = 30 * 60
const MIN_SEC = 30 * 60
const MAX_SEC = 5 * 60 * 60

/** Start recording — duration, presets, translucent card on black (no background images). */
export default function RecordingTimeScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState
  const scanned = state?.scanned?.trim() || ''

  const venueName = state?.venueName?.trim() || 'TGS Sports Arena'
  const venueAddress = state?.venueAddress?.trim() || 'Andheri West, Mumbai'

  const [durationSec, setDurationSec] = useState(60 * 60)
  const [activePreset, setActivePreset] = useState<string>('60')

  const displayTime = useMemo(() => formatHMS(durationSec), [durationSec])

  const applyPreset = useCallback((id: (typeof PRESETS)[number]['id']) => {
    const p = PRESETS.find((x) => x.id === id)
    if (!p) return
    setDurationSec(p.seconds)
    setActivePreset(id)
  }, [])

  const bump = useCallback((delta: number) => {
    setDurationSec((prev) => {
      const raw = prev + delta
      const snapped = STEP_SEC > 0 ? Math.round(raw / STEP_SEC) * STEP_SEC : raw
      const next = Math.min(MAX_SEC, Math.max(MIN_SEC, snapped))
      const match = PRESETS.find((p) => p.seconds === next)
      setActivePreset(match?.id ?? '')
      return next
    })
  }, [])

  const onStart = () => {
    navigate('/recording-active', {
      state: {
        plannedDurationSec: durationSec,
        scanned: scanned || undefined,
        venueName,
        venueAddress,
      },
    })
  }

  return (
    <div className="rt-page">
      <button type="button" className="rt-back" onClick={() => navigate(-1)} aria-label="Go back">
        <BackIcon />
      </button>

      <div className="rt-scroll">
        <div className="rt-card">
          <div className="rt-location">
            <span className="rt-location__pin" aria-hidden>
              <PinIcon />
            </span>
            <div className="rt-location__text">
              <p className="rt-location__name">{venueName}</p>
              <p className="rt-location__addr">{venueAddress}</p>
              {scanned ? (
                <p className="rt-location__qr" title={scanned}>
                  {scanned.length > 48 ? `${scanned.slice(0, 45)}…` : scanned}
                </p>
              ) : null}
            </div>
          </div>

          <button type="button" className="rt-court">
            <GridIcon />
            <span>Court 1</span>
          </button>

          <div className="rt-timer-row">
            <button type="button" className="rt-step rt-step--minus" onClick={() => bump(-STEP_SEC)} aria-label="Decrease duration">
              <span>−</span>
            </button>

            <div className="rt-dial" aria-live="polite">
              <span className="rt-dial__time">{displayTime}</span>
            </div>

            <button type="button" className="rt-step rt-step--plus" onClick={() => bump(STEP_SEC)} aria-label="Increase duration">
              <span>+</span>
            </button>
          </div>

          <div className="rt-presets" role="group" aria-label="Duration presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`rt-preset ${activePreset === p.id ? 'rt-preset--active' : ''}`}
                onClick={() => applyPreset(p.id)}
              >
                <span className="rt-preset__top">{p.top}</span>
                <span className="rt-preset__bottom">{p.bottom}</span>
              </button>
            ))}
          </div>

          <button type="button" className="rt-start" onClick={onStart}>
            <PlayIcon />
            <span>Start Recording</span>
          </button>
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

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
      <path fill="currentColor" d="M10.5 9.5v5l4-2.5-4-2.5z" />
    </svg>
  )
}
