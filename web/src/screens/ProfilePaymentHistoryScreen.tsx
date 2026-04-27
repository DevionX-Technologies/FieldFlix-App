import { useNavigate } from 'react-router-dom'

const BG = '#00050A'

export default function ProfilePaymentHistoryScreen() {
  const navigate = useNavigate()

  return (
    <div className="relative flex h-full min-h-0 flex-col font-sans text-white" style={{ backgroundColor: BG }}>
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.08] px-4 pb-4 pt-[max(12px,env(safe-area-inset-top,12px))]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white outline-none ring-offset-2 ring-offset-[#00050A] focus-visible:ring-2 focus-visible:ring-[#22C55E]"
          aria-label="Go back"
        >
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[20px] font-bold tracking-tight">Payment History</h1>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-12">
        <p className="pt-10 text-center text-[15px] leading-relaxed text-white/55">
          No transactions yet. When you subscribe or make a purchase, your receipts will appear here.
        </p>
      </main>
    </div>
  )
}
