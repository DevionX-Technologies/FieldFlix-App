import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'

const BG = '#050A0E'
const ACCENT = '#4ade80'
const CARD_BG = '#151c26'

export default function ScanQrScreen() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraError, setCameraError] = useState<string | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(true)
  const navigatedRef = useRef(false)

  // Preview: after 5s go to recording screen even if no QR was decoded (remove when done testing).
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (navigatedRef.current) return
      navigatedRef.current = true
      navigate('/recording-time', { replace: true })
    }, 5000)
    return () => window.clearTimeout(t)
  }, [navigate])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera is not available in this browser.')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          await v.play().catch(() => {})
        }
        const track = stream.getVideoTracks()[0]
        const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean }
        setTorchSupported(!!caps?.torch)
        setCameraError(null)
      } catch {
        setCameraError('Allow camera access to scan QR codes.')
      }
    })()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [])

  const toggleTorch = useCallback(async () => {
    const stream = streamRef.current ?? videoRef.current?.srcObject
    if (!(stream instanceof MediaStream)) return
    const track = stream.getVideoTracks()[0]
    if (!track?.getCapabilities) return
    const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }
    if (!caps.torch) {
      setTorchSupported(false)
      return
    }
    const next = !torchOn
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet & { torch?: boolean }],
      })
      setTorchOn(next)
    } catch {
      setTorchSupported(false)
    }
  }, [torchOn])

  useEffect(() => {
    if (!videoReady || navigatedRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    let raf = 0
    let stopped = false

    const tick = () => {
      if (stopped || navigatedRef.current) return
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const w = video.videoWidth
        const h = video.videoHeight
        if (w > 0 && h > 0) {
          canvas.width = w
          canvas.height = h
          ctx.drawImage(video, 0, 0, w, h)
          const imageData = ctx.getImageData(0, 0, w, h)
          const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' })
          if (code?.data) {
            navigatedRef.current = true
            if (typeof navigator.vibrate === 'function') navigator.vibrate(36)
            navigate('/recording-time', { state: { scanned: code.data }, replace: true })
            return
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [videoReady, navigate])

  return (
    <div
      className="relative flex h-full min-h-0 flex-col font-sans text-white"
      style={{ backgroundColor: BG }}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.08] px-4 pb-4 pt-[max(12px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-xl p-2 text-white outline-none ring-offset-2 ring-offset-[#050A0E] focus-visible:ring-2 focus-visible:ring-[#4ade80]"
          aria-label="Go back"
        >
          <BackIcon className="h-7 w-7" />
        </button>
        <h1 className="text-[18px] font-bold tracking-tight">Scan QR Code</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(100px,env(safe-area-inset-bottom))] pt-4">
        <div
          className="flex min-h-[min(420px,55vh)] flex-1 flex-col overflow-hidden rounded-[20px]"
          style={{ backgroundColor: CARD_BG }}
        >
          <div className="relative min-h-0 flex-1 overflow-hidden bg-black/40">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              muted
              autoPlay
              onLoadedData={() => setVideoReady(true)}
            />
            <canvas ref={canvasRef} className="hidden" aria-hidden />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="aspect-square w-[min(72vw,260px)] rounded-2xl border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.62)]"
                style={{ borderColor: ACCENT }}
              />
            </div>

            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6 text-center text-[14px] text-white/85">
                {cameraError}
              </div>
            )}
          </div>

          <p className="shrink-0 px-4 py-4 text-center text-[14px] leading-snug text-white/65">
            Align the QR code within the frame
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleTorch}
        disabled={!videoReady || !!cameraError || !torchSupported}
        title={!torchSupported ? 'Flash is not supported on this device' : torchOn ? 'Turn flash off' : 'Turn flash on'}
        className={`absolute bottom-[max(24px,env(safe-area-inset-bottom))] right-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-[#1a222e]/95 text-white shadow-lg outline-none backdrop-blur-sm transition-opacity focus-visible:ring-2 focus-visible:ring-[#4ade80] disabled:opacity-40 ${
          torchOn ? 'ring-2 ring-[#4ade80]/60' : ''
        }`}
        aria-label={torchOn ? 'Turn flash off' : 'Turn flash on'}
      >
        <FlashlightIcon className="h-7 w-7" active={torchOn} />
      </button>

    </div>
  )
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function FlashlightIcon({ className, active }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 18v3M8 21h8M9 3h6v7a3 3 0 01-6 0V3z"
        opacity={active ? 1 : 0.92}
      />
    </svg>
  )
}
