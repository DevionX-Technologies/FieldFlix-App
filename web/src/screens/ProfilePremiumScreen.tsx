import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './profilePremium.css'

type PaymentMethod = 'upi' | 'card' | 'netbank'

/** Premium upgrade screen — markup matches exported design; styles in `profilePremium.css`. */
export default function ProfilePremiumScreen() {
  const navigate = useNavigate()
  const [payment, setPayment] = useState<PaymentMethod>('upi')
  const plansScrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = plansScrollRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    if (max > 0) el.scrollLeft = max / 2
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#020617]">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-28 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="main-container">
          <div className="rectangle" />
          <button type="button" className="premium-back-btn frame" onClick={() => navigate(-1)} aria-label="Go back">
            <div className="frame-1" />
          </button>
          <div className="frame-2">
            <div className="frame-3" />
            <span className="unlock-potential">Unlock your potential</span>
          </div>
          <div className="frame-4">
            <div className="frame-5">
              <span className="upgrade-game">Upgrade Your Game</span>
            </div>
            <div className="frame-6">
              <span className="unlock-features-insights">Unlock advanced features and insights</span>
            </div>
          </div>
          <div className="frame-7">
            <span className="most-popular">Most Popular</span>
          </div>
          <div className="premium-plans-scroll" ref={plansScrollRef}>
          <div className="flex-row-e">
            <div className="rounded-rectangle">
              <div className="frame-8">
                <div className="frame-9">
                  <span className="pro-plan">Pro Plan</span>
                </div>
                <div className="frame-a">
                  <span className="recommended">(Recommended)</span>
                </div>
              </div>
              <div className="frame-b">
                <div className="frame-c">
                  <div className="price-per-month">
                    <span className="price">₹199 </span>
                    <span className="per-month">/month</span>
                  </div>
                </div>
              </div>
              <div className="frame-d">
                <div className="frame-e">
                  <div className="frame-f" />
                  <div className="frame-10">
                    <span className="advanced-features">Advanced features</span>
                  </div>
                </div>
                <div className="frame-11">
                  <div className="frame-12" />
                  <div className="frame-13">
                    <span className="video-recording">Video Recording</span>
                  </div>
                </div>
                <div className="frame-14">
                  <div className="frame-15" />
                  <div className="frame-16">
                    <span className="view-ai-insights">View AI insights</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-rectangle-17">
              <div className="frame-18">
                <div className="frame-19">
                  <span className="premium-plan">Premium Plan</span>
                </div>
                <div className="frame-1a">
                  <span className="elite">(Elite)</span>
                </div>
              </div>
              <div className="frame-1b">
                <div className="frame-1c">
                  <div className="monthly-price">
                    <span className="price-1d">₹399 </span>
                    <span className="per-month-1e">/month</span>
                  </div>
                </div>
              </div>
              <div className="frame-1f">
                <div className="frame-20">
                  <div className="frame-21" />
                  <div className="frame-22">
                    <span className="ai-features">AI features</span>
                  </div>
                </div>
                <div className="frame-23">
                  <div className="frame-24" />
                  <div className="frame-25">
                    <span className="ai-features-26">AI features</span>
                  </div>
                </div>
                <div className="frame-27">
                  <div className="frame-28" />
                  <div className="frame-29">
                    <span className="unlimited-storage">Unlimited Storage</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-rectangle-2a">
              <div className="frame-2b">
                <div className="frame-2c">
                  <span className="free-plan">Free Plan</span>
                </div>
                <div className="frame-2d">
                  <span className="basic">(Basic)</span>
                </div>
              </div>
              <div className="frame-2e">
                <div className="frame-2f">
                  <div className="per-month-30">
                    <span className="rupees-per-month">₹149 </span>
                    <span className="per-month-31">/month</span>
                  </div>
                </div>
              </div>
              <div className="frame-32">
                <div className="frame-33">
                  <div className="frame-34" />
                  <div className="frame-35">
                    <span className="track-sessions">Track Sessions</span>
                  </div>
                </div>
                <div className="frame-36">
                  <div className="frame-37" />
                  <div className="frame-38">
                    <span className="view-basic-stats">View basic Stats</span>
                  </div>
                </div>
                <div className="frame-39">
                  <div className="frame-3a" />
                  <div className="frame-3b">
                    <span className="view-analyts">View Analyts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
          <div className="flex-row-bc">
            <div className="frame-3c">
              <div className="frame-3d">
                <div className="frame-3e">
                  <div className="frame-3f">
                    <div className="frame-40" />
                    <div className="frame-41">
                      <span className="recordings">Recordings</span>
                    </div>
                  </div>
                  <div className="ellipse" />
                </div>
                <div className="frame-42">
                  <span className="access-full-match">Access full match recordings anytime, on demand.</span>
                </div>
              </div>
            </div>
            <div className="frame-43">
              <div className="frame-44">
                <span className="feature-list">Feature List</span>
              </div>
              <div className="frame-45">
                <div className="vector" />
                <div className="frame-46">
                  <span className="advanced-analytics">Advanced Analytics</span>
                </div>
              </div>
              <div className="frame-47">
                <div className="vector-48" />
                <div className="frame-49">
                  <span className="video-recording-replays">Video Recording & Replays</span>
                </div>
              </div>
              <div className="frame-4a">
                <div className="vector-4b" />
                <div className="frame-4c">
                  <span className="ai-powered-performance">AI-Powered Performance Insights</span>
                </div>
              </div>
              <div className="frame-4d">
                <div className="vector-4e" />
                <div className="frame-4f">
                  <span className="unlimited-data-storage">Unlimited Data Storage</span>
                </div>
              </div>
            </div>
          </div>
          <div className="frame-50">
            <div className="frame-51">
              <span className="payment-methods">Payment Methods</span>
            </div>
            <button
              type="button"
              className={`frame-52 ${payment === 'upi' ? 'payment-row--selected' : ''}`}
              onClick={() => setPayment('upi')}
            >
              <div className="frame-53">
                <div className="image" />
                <div className="frame-54">
                  <div className="frame-55">
                    <span className="upi">UPI</span>
                  </div>
                  <div className="group" />
                </div>
              </div>
            </button>
            <button
              type="button"
              className={`frame-56 ${payment === 'card' ? 'payment-row--selected' : ''}`}
              onClick={() => setPayment('card')}
            >
              <div className="frame-57">
                <div className="frame-58">
                  <div className="frame-59" />
                  <div className="frame-5a">
                    <span className="credit-debit-card">Credit / Debit Card</span>
                  </div>
                </div>
                <div className="image-5b" />
              </div>
            </button>
            <button
              type="button"
              className={`frame-5c ${payment === 'netbank' ? 'payment-row--selected' : ''}`}
              onClick={() => setPayment('netbank')}
            >
              <div className="frame-5d">
                <div className="frame-5e" />
                <div className="frame-5f">
                  <span className="net-banking">Net Banking</span>
                </div>
              </div>
            </button>
          </div>
          <button type="button" className="frame-60">
            <span className="upgrade-now">Upgrade Now</span>
          </button>
        </div>
      </div>
    </div>
  )
}
