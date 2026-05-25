import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL, SUPPORT_INBOX_EMAIL } from '../config'
import { unwrapNestPayload } from '../utils/unwrapNestPayload'
import { P } from './profileSubScreensAssets'
import './profileContactUsScreen.css'

const ISSUES = [
  { id: 'bug' as const, label: 'Report a Bug' },
  { id: 'feature' as const, label: 'Suggest a Feature' },
  { id: 'general' as const, label: 'General Query' },
]

export default function ProfileContactUsScreen() {
  const navigate = useNavigate()
  const [issue, setIssue] = useState<(typeof ISSUES)[number]['id']>('bug')
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSend() {
    setFormError(null)
    const name = fullName.trim()
    const digits = mobile.replace(/\D/g, '')
    const body = description.trim()
    if (name.length === 0) {
      setFormError('Please enter your full name.')
      return
    }
    if (digits.length < 10) {
      setFormError('Please enter at least 10 digits for your mobile number.')
      return
    }
    if (body.length < 3) {
      setFormError('Please describe your issue in more detail.')
      return
    }
    const base = API_BASE_URL.replace(/\/+$/, '')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (base.includes('ngrok')) {
      headers['ngrok-skip-browser-warning'] = 'true'
    }
    try {
      setSubmitting(true)
      const res = await fetch(`${base}/support/contact`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          issueType: issue,
          fullName: name,
          mobile: digits.slice(0, 15),
          description: body,
        }),
      })
      const json = (await res.json()) as unknown
      if (!res.ok) {
        const m =
          typeof json === 'object' &&
          json !== null &&
          'message' in json &&
          (typeof (json as { message: unknown }).message === 'string' ||
            Array.isArray((json as { message: unknown }).message))
            ? Array.isArray((json as { message: unknown }).message)
              ? ((json as { message: unknown }).message as string[]).join('\n')
              : String((json as { message: string }).message)
            : `Request failed (${res.status})`
        setFormError(m)
        return
      }
      void unwrapNestPayload(json)
      setDescription('')
      alert('Thanks — we received your message and usually reply within 24 hours.')
    } catch {
      setFormError('Network error — check your connection and API URL.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pcu-page">
      <header className="pcu-head">
        <button type="button" className="pcu-back" onClick={() => navigate(-1)} aria-label="Go back">
          <img src={P.contactBack} alt="" width={24} height={24} draggable={false} />
        </button>
        <h1 className="pcu-title">Contact Support</h1>
      </header>

      <main className="pcu-scroll">
        <p className="pcu-tagline">We’re here to help you anytime</p>

        <div className="pcu-label-row">
          <img src={P.contactIssue} alt="" width={15} height={15} draggable={false} />
          <span>Issue Type</span>
        </div>

        {ISSUES.map((row) => (
          <button
            key={row.id}
            type="button"
            className={`pcu-issue ${issue === row.id ? 'pcu-issue--active' : ''}`}
            onClick={() => setIssue(row.id)}
          >
            {row.label}
          </button>
        ))}

        <div className="pcu-details-label">
          <img src={P.contactDetails} alt="" width={16} height={16} draggable={false} />
          <span>Your Details</span>
        </div>

        <label className="pcu-field">
          <img src={P.contactName} alt="" width={20} height={20} draggable={false} />
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" aria-label="Full name" />
        </label>

        <label className="pcu-field">
          <img src={P.contactPhone} alt="" width={18} height={18} draggable={false} />
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 15))}
            placeholder="Mobile Number"
            inputMode="numeric"
            aria-label="Mobile number"
          />
        </label>

        <label className="pcu-field pcu-field--tall">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your issue" rows={4} aria-label="Describe your issue" />
        </label>

        {formError ? (
          <p className="pcu-form-error" role="alert">
            {formError}
          </p>
        ) : null}

        <button
          type="button"
          className={`pcu-send${submitting ? ' pcu-send--busy' : ''}`}
          onClick={() => void handleSend()}
          disabled={submitting}
        >
          {submitting ? 'Sending…' : 'Send Message'}
        </button>

        <p className="pcu-foot">We usually respond within 24 hours</p>
        <p className="pcu-or">Or contact us directly</p>
        <a className="pcu-email" href={`mailto:${encodeURIComponent(SUPPORT_INBOX_EMAIL)}`}>
          {SUPPORT_INBOX_EMAIL}
        </a>
      </main>
    </div>
  )
}
