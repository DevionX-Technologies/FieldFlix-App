import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ToggleSwitch from '../components/ToggleSwitch'
import { P } from './profileSubScreensAssets'
import './profileNotificationSettingsScreen.css'

const SWITCH_ON = '#22c55e'

export default function ProfileNotificationSettingsScreen() {
  const navigate = useNavigate()

  const [activity, setActivity] = useState({
    matchAlerts: true,
    performance: false,
    weekly: false,
    email: false,
    push: false,
  })
  const [schedule, setSchedule] = useState({
    quietHours: true,
    snooze: false,
  })
  const [personalization, setPersonalization] = useState({
    matchAlerts: false,
    performance: false,
    weekly: true,
    email: false,
    push: false,
  })
  const [insights, setInsights] = useState({
    weekly: false,
    monthly: false,
    milestone: false,
  })

  return (
    <div className="pns-page">
      <header className="pns-head">
        <button type="button" className="pns-back" onClick={() => navigate(-1)} aria-label="Go back">
          <img src={P.notifBack} alt="" width={24} height={24} draggable={false} />
        </button>
        <h1 className="pns-title">Notifications</h1>
      </header>

      <main className="pns-scroll">
        <section className="pns-block">
          <SectionHead src={P.notifActivity} label="Activity Notifications" />
          <ToggleLine
            label="Match Alerts"
            checked={activity.matchAlerts}
            onChange={(v) => setActivity((s) => ({ ...s, matchAlerts: v }))}
          />
          <ToggleLine
            label="Performance Updates"
            checked={activity.performance}
            onChange={(v) => setActivity((s) => ({ ...s, performance: v }))}
          />
          <ToggleLine
            label="Weekly Summary"
            checked={activity.weekly}
            onChange={(v) => setActivity((s) => ({ ...s, weekly: v }))}
          />
          <ToggleLine
            label="Email Notifications"
            checked={activity.email}
            onChange={(v) => setActivity((s) => ({ ...s, email: v }))}
          />
          <ToggleLine
            label="Push Notifications"
            checked={activity.push}
            onChange={(v) => setActivity((s) => ({ ...s, push: v }))}
          />
        </section>

        <div className="pns-rule" />

        <section className="pns-block">
          <SectionHead src={P.notifSchedule} label="Schedule & Control" />
          <ToggleLine
            label="Quiet Hours"
            checked={schedule.quietHours}
            onChange={(v) => setSchedule((s) => ({ ...s, quietHours: v }))}
          />
          <ToggleLine
            label="Snooze Notification"
            checked={schedule.snooze}
            onChange={(v) => setSchedule((s) => ({ ...s, snooze: v }))}
          />
        </section>

        <div className="pns-rule" />

        <section className="pns-block">
          <SectionHead src={P.notifPersonal} label="Personalization" />
          <ToggleLine
            label="Match Alerts"
            checked={personalization.matchAlerts}
            onChange={(v) => setPersonalization((s) => ({ ...s, matchAlerts: v }))}
          />
          <ToggleLine
            label="Performance Updates"
            checked={personalization.performance}
            onChange={(v) => setPersonalization((s) => ({ ...s, performance: v }))}
          />
          <ToggleLine
            label="Weekly Summary"
            checked={personalization.weekly}
            onChange={(v) => setPersonalization((s) => ({ ...s, weekly: v }))}
          />
          <ToggleLine
            label="Email Notifications"
            checked={personalization.email}
            onChange={(v) => setPersonalization((s) => ({ ...s, email: v }))}
          />
          <ToggleLine
            label="Push Notifications"
            checked={personalization.push}
            onChange={(v) => setPersonalization((s) => ({ ...s, push: v }))}
          />
        </section>

        <div className="pns-rule" />

        <section className="pns-block">
          <SectionHead src={P.notifInsights} label="Insights & Reports" />
          <ToggleLine label="Weekly Summary" checked={insights.weekly} onChange={(v) => setInsights((s) => ({ ...s, weekly: v }))} />
          <ToggleLine
            label="Monthly Performance Report"
            checked={insights.monthly}
            onChange={(v) => setInsights((s) => ({ ...s, monthly: v }))}
          />
          <ToggleLine label="Milestone Alerts" checked={insights.milestone} onChange={(v) => setInsights((s) => ({ ...s, milestone: v }))} />
        </section>

        <div className="pns-rule" />

        <div className="pns-preview-wrap">
          <div className="pns-preview-hdr">
            <img src={P.previewSection} alt="" width={16} height={16} draggable={false} />
            <span>Preview Notification</span>
          </div>
          <div className="pns-preview-card" style={{ backgroundImage: `url(${P.previewTopBg})` }}>
            <div className="pns-preview-inner">
              <img src={P.previewIcon} alt="" className="pns-preview-icon" width={24} height={24} draggable={false} />
              <div className="pns-preview-body">
                <div className="pns-preview-top">
                  <p className="pns-preview-title">Team Alert</p>
                  <span className="pns-preview-time">5m</span>
                </div>
                <p className="pns-preview-text">
                  Your favorite team kicks off in 30 minutes!
                  <br />
                  Get ready for the match!{' '}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function SectionHead({ src, label }: { src: string; label: string }) {
  return (
    <div className="pns-section-head">
      <img src={src} alt="" className="pns-section-head__icon" width={16} height={16} draggable={false} />
      <span className="pns-section-head__label">{label}</span>
    </div>
  )
}

function ToggleLine({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="pns-row">
      <span className="pns-row__label">{label}</span>
      <ToggleSwitch checked={checked} onChange={onChange} onColor={SWITCH_ON} />
    </div>
  )
}
