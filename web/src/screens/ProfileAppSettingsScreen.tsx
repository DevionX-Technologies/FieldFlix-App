import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ToggleSwitch from '../components/ToggleSwitch'
import { P } from './profileSubScreensAssets'
import './profileAppSettingsScreen.css'

const SWITCH_ON = '#22c55e'

export default function ProfileAppSettingsScreen() {
  const navigate = useNavigate()
  const [visibility, setVisibility] = useState({
    publicProfile: false,
    showStats: false,
    showLocation: false,
  })
  const [dataTracking, setDataTracking] = useState(false)

  return (
    <div className="pas-page">
      <header className="pas-head">
        <button type="button" className="pas-back" onClick={() => navigate(-1)} aria-label="Go back">
          <img src={P.appBack} alt="" width={24} height={24} draggable={false} />
        </button>
        <h1 className="pas-title">App Settings</h1>
      </header>

      <main className="pas-scroll">
        <section className="pas-section">
          <div className="pas-section-head">
            <img src={P.appVisibility} alt="" width={16} height={16} draggable={false} />
            <span>Profile Visibility</span>
          </div>
          <div className="pas-row">
            <span className="pas-row__label">Public Profile</span>
            <ToggleSwitch checked={visibility.publicProfile} onChange={(v) => setVisibility((s) => ({ ...s, publicProfile: v }))} onColor={SWITCH_ON} />
          </div>
          <div className="pas-row">
            <span className="pas-row__label">Show Stats to Others</span>
            <ToggleSwitch checked={visibility.showStats} onChange={(v) => setVisibility((s) => ({ ...s, showStats: v }))} onColor={SWITCH_ON} />
          </div>
          <div className="pas-row">
            <span className="pas-row__label">Show Location</span>
            <ToggleSwitch checked={visibility.showLocation} onChange={(v) => setVisibility((s) => ({ ...s, showLocation: v }))} onColor={SWITCH_ON} />
          </div>
        </section>

        <div className="pas-rule" />

        <section className="pas-section">
          <div className="pas-section-head">
            <img src={P.appData} alt="" width={16} height={16} draggable={false} />
            <span>Data & Permissions</span>
          </div>
          <div className="pas-row">
            <span className="pas-row__label">Allow Data Tracking</span>
            <ToggleSwitch checked={dataTracking} onChange={setDataTracking} onColor={SWITCH_ON} />
          </div>
          <button type="button" className="pas-row-btn" onClick={() => {}}>
            <span>Download My Data</span>
            <img src={P.appChevron} alt="" width={20} height={20} draggable={false} />
          </button>
          <button type="button" className="pas-row-btn" onClick={() => {}}>
            <span>Clear App Data</span>
            <img src={P.appChevron} alt="" width={20} height={20} draggable={false} />
          </button>
        </section>
      </main>
    </div>
  )
}
