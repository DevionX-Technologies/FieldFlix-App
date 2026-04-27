import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function OtpScreen() {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [timer, setTimer] = useState(90)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (timer <= 0) return
    const interval = setInterval(() => setTimer((t) => t - 1), 1000)
    return () => clearInterval(interval)
  }, [timer])

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${min}:${sec}`
  }

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col items-center">

      {/* 1. BACKGROUND HANDLING — Football stadium background */}
      <div className="absolute inset-0 z-0">
        <img
          src="/image16.png"
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center' }}
        />
        {/* Gradient overlay for text readability */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.8) 100%)'
          }}
        />
      </div>

      {/* 2. CONTENT LAYER — Centered flex structure */}
      <div className="relative z-10 w-full h-full flex flex-col items-center py-12 px-6">

        {/* Vertical spacing at the top */}
        <div className="h-[12%] shrink-0" />

        {/* Header Section */}
        <div className="text-center">
          <p className="text-[13px] font-medium tracking-wide text-white/70 uppercase">
            Mobile Number Verification
          </p>
          <h1
            className="mt-2 text-[36px] font-bold text-white"
            style={{ fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '-0.01em' }}
          >
            Enter OTP
          </h1>
          <p className="mt-3 text-center text-[14px] leading-relaxed text-white/60">
            We have sent a one-time password
            <br />
            to <span className="text-white/80">+91 XXXXXXXXXX</span>
          </p>
        </div>

        {/* OTP Input Boxes (6 Boxes) */}
        <div className="mt-12 flex w-full justify-between gap-2 max-w-[360px]">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="outline-none text-center"
              style={{
                width: 50,
                height: 60,
                borderRadius: 10,
                backgroundColor: 'rgba(30, 30, 34, 0.95)',
                border: digit ? '2.5px solid #22c55e' : '2.5px solid rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: 24,
                fontWeight: 700,
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* Green Timer */}
        <p className="mt-10 text-[26px] font-bold tabular-nums text-[#22c55e]">
          {formatTime(timer)}
        </p>

        {/* Verify OTP Button */}
        <button
          type="button"
          onClick={() => navigate('/account-type')}
          className="mt-10 w-full max-w-[360px] rounded-full text-[17px] font-bold text-white transition-transform active:scale-[0.98]"
          style={{
            height: 56,
            background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
            boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
          }}
        >
          Verify OTP
        </button>

        {/* Resend OTP Link */}
        <button
          type="button"
          onClick={() => { if (timer <= 0) setTimer(90) }}
          className="mt-12 border-none bg-transparent text-[15px] font-semibold transition-opacity hover:opacity-80"
          style={{
            color: timer > 0 ? 'rgba(255,255,255,0.5)' : '#22c55e',
            cursor: timer > 0 ? 'default' : 'pointer'
          }}
        >
          Resend OTP
        </button>

      </div>
    </div>
  )
}
