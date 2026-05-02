import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { P, RATE_STARS } from './profileSubScreensAssets'
import './profileRateUsScreen.css'

const RATE_KEY = 'fieldflicks-rate-us-submitted-web'

export default function ProfileRateUsScreen() {
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    try {
      setSubmitted(window.localStorage.getItem(RATE_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const onSubmit = () => {
    if (rating < 1) {
      window.alert('Tap the stars to choose a rating first.')
      return
    }
    try {
      window.localStorage.setItem(RATE_KEY, '1')
      setSubmitted(true)
      window.open(
        'https://play.google.com/store/apps/details?id=com.fieldflicks',
        '_blank',
        'noopener,noreferrer',
      )
    } catch {
      window.alert(`Thanks — you rated ${rating} star${rating === 1 ? '' : 's'}.`)
      setSubmitted(true)
    }
  }

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
                  onClick={() => !submitted && setRating(n)}
                  disabled={submitted}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >
                  <img src={src} alt="" width={30} height={30} draggable={false} />
                </button>
              )
            })}
          </div>
          <p className="pru-sub">Your feedback helps us improve</p>
          {submitted ? (
            <p className="pru-status" role="status">
              Status: submitted — thanks for rating FieldFlicks.
            </p>
          ) : null}
          <button
            type="button"
            className="pru-submit"
            onClick={onSubmit}
            disabled={submitted}
          >
            {submitted ? 'Submitted' : 'Submit Review'}
          </button>
          <button type="button" className="pru-later" onClick={() => navigate(-1)}>
            Maybe Later
          </button>
        </div>
      </main>
    </div>
  )
}
