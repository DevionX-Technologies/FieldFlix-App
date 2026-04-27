import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { P, RATE_STARS } from './profileSubScreensAssets'
import './profileRateUsScreen.css'

export default function ProfileRateUsScreen() {
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)

  return (
    <div className="pru-page">
      <header className="pru-head">
        <button type="button" className="pru-back" onClick={() => navigate(-1)} aria-label="Go back">
          <img src={P.rateBack} alt="" width={24} height={24} draggable={false} />
        </button>
        <h1 className="pru-title">Rate Us</h1>
      </header>

      <main className="pru-scroll">
        <div className="pru-card" style={{ backgroundImage: `url(${P.rateCardBg})` }}>
          <p className="pru-card__title">Enjoying the App?</p>
          <div className="pru-stars" role="group" aria-label="Star rating">
            {RATE_STARS.map((src, i) => {
              const n = i + 1
              const on = n <= rating
              return (
                <button
                  key={src}
                  type="button"
                  className={`pru-star-btn ${on ? 'pru-star-btn--on' : ''}`}
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >
                  <img src={src} alt="" width={30} height={30} draggable={false} />
                </button>
              )
            })}
          </div>
          <p className="pru-sub">Your feedback helps us improve</p>
          <button type="button" className="pru-submit">
            Submit Review
          </button>
          <button type="button" className="pru-later" onClick={() => navigate(-1)}>
            Maybe Later
          </button>
        </div>
      </main>
    </div>
  )
}
