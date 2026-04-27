import React, { useEffect, useState } from 'react'

// Framer Code Component for Shared Recording Landing Page
export default function SharedRecordingLanding() {
  const [recordingId, setRecordingId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Extract recording ID from current page URL
    const path = window.location.pathname
    const id = path.split('/').pop()
    if (id) {
      setRecordingId(id)
    }
  }, [])

  const handleOpenApp = () => {
    setLoading(true)
    
    // Generate deep link
    const deepLink = `fieldflicks://shared-recording/${recordingId}`
    
    // Try to open the app
    const startTime = Date.now()
    
    // For mobile browsers, try to trigger deep link
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      // Create hidden iframe to trigger deep link
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = deepLink
      document.body.appendChild(iframe)
      
      // Cleanup and fallback
      setTimeout(() => {
        document.body.removeChild(iframe)
        const timeElapsed = Date.now() - startTime
        
        if (timeElapsed >= 2500) {
          setLoading(false)
          // Redirect to appropriate app store
          if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            window.location.href = 'https://apps.apple.com/app/fieldflicks/id1234567890' // Update with your iOS App Store ID
          } else if (/Android/.test(navigator.userAgent)) {
            window.location.href = 'https://play.google.com/store/apps/details?id=com.fieldflicks&hl=en_IN'
          }
        }
      }, 3000)
    } else {
      // Desktop - show app store options
      setLoading(false)
      alert('FieldFlicks is available on mobile devices. Please visit the App Store or Google Play Store.')
    }
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: '120px',
          height: '120px',
          background: 'white',
          borderRadius: '20px',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1e3c72',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}
      >
        ⚽📱
      </div>
      
      {/* Title */}
      <h1 style={{ fontSize: '2.5rem', marginBottom: '15px', fontWeight: 700 }}>
        FieldFlicks
      </h1>
      
      {/* Subtitle */}
      <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '40px' }}>
        Check out this amazing game recording!
      </p>
      
      {/* Action Button */}
      <button
        onClick={handleOpenApp}
        disabled={loading}
        style={{
          padding: '15px 30px',
          border: 'none',
          borderRadius: '12px',
          fontSize: '1.1rem',
          fontWeight: 600,
          background: loading ? '#888' : '#4CAF50',
          color: 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Opening FieldFlicks...' : 'Open in FieldFlicks App'}
      </button>
      
      {/* App Store Badges */}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a
          href="https://apps.apple.com/app/fieldflicks/id1234567890"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
            alt="Download on App Store"
            style={{ height: '60px' }}
          />
        </a>
        <a
          href="https://play.google.com/store/apps/details?id=com.fieldflicks&hl=en_IN"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
            alt="Get it on Google Play"
            style={{ height: '60px' }}
          />
        </a>
      </div>
      
      {/* Footer */}
      <p style={{ 
        position: 'absolute', 
        bottom: '20px', 
        opacity: 0.7, 
        fontSize: '0.9rem' 
      }}>
        FieldFlicks - Capture Every Moment
      </p>
    </div>
  )
}

// Export for Framer
export { SharedRecordingLanding }
