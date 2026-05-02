# FieldFlicks — Release Notes

Version 1.2.0

## What's in the app

### Authentication
- Phone-number login with OTP verification.
- New-user signup with name capture, then straight to the home screen.
- Persistent sessions via secure token storage; auto-logout on token expiry.

### Home
- Personalized arena feed sorted by proximity when location is available.
- Sport filter (Pickleball, Padel, Cricket) with remembered preference.
- "Coming soon" promo carousel.
- Recent recordings strip and shared recordings strip surfaced from your account.
- Quick access to notifications with unread badge.

### Recording
- QR-scan flow to start a recording at a partner arena.
- Camera preview, ground/court selection, and duration picker.
- Live recording timer with start / stop controls.
- Post-recording confirmation and shareable recording state.

### Sessions
- Chronological list of every match you've recorded.
- Sport filter chips (All / Pickleball / Padel / Cricket).
- Per-card sport icon, arena, location, time, and processing / completed status.
- Native share for any session.
- Lock / unlock badge on every card showing paid-vs-unpaid state at a glance.

### Recordings
- Three tabs: My Recordings, Shared Recordings, Find Recordings.
- My Recordings — full list of your matches with thumbnails, highlight counts, and lock indicator.
- Shared Recordings — sub-tabs for "Shared with me" and "Shared by me," grouped by people.
- Find Recordings — claim a recording you started but never logged in to: pick venue, court, date, time window, and verify with the player's phone number.
- Venue dropdown is fetched live from the FieldFlicks venue database, paginated across all sports.
- Court / ground dropdown auto-populates once a venue is chosen, sorted numerically.
- Native share, deep-link copy, and share-link generation for each recording.

### Highlights & playback
- Recording playback screen with preview-only / full-match unlock states.
- "Top Highlights" list per recording with status, thumbnail, and duration.
- One-tap unlock to upgrade from preview to full match.
- Highlight save, share, and engage actions where available.

### FlickShorts
- Vertical short-video reel of approved highlights from across the platform.
- Public discovery feed plus your own approved shorts.

### Profile
- Editable profile (name, avatar, contact details).
- App Settings — public / private profile toggle, show-stats toggle, show-location toggle, data-tracking opt-in.
- Notification Settings — granular control over which alerts you receive.
- Payment History — every transaction with status (Paid / Pending / Failed), amount, date, and tappable receipts.
- Premium / plans screen for subscription tiers.
- Privacy, Contact Us, Rate Us, and About surfaces.

### Sharing
- Native share sheets across recordings, sessions, highlights, and shorts.
- Share-by-link for non-account holders, gated by share tokens.
- Open-in-app deep links from a shared URL.

### Notifications
- In-app notification center with read / unread state.
- Push notifications for recording-ready, share, and engagement events.
- Recording-ready toast that surfaces the moment processing completes.

### Payments
- Razorpay-powered checkout for unlocks and subscriptions.
- Per-recording unlock and per-plan purchase flows.
- Receipt detail screen with line items and downloadable summary.
- Sync of unlocked recordings between devices through your account.

### Navigation & polish
- Back gestures behave consistently: from any sub-tab on Recordings (Shared / Find) you return to My Recordings, then to Home.
- Hardware back, header back arrow, and edge-swipe gesture all follow the same path on iOS and Android.

## Enhanced UI

- **Lock / unlock badges** are now consistent across both the Sessions screen and the Recordings screen, so you can tell at a glance which matches you've already unlocked.
- **Find Recordings dropdowns** for venue and court / ground are populated live from the database, sorted, and filterable as you type.
- **Recordings — back navigation** is now reliable across both platforms; sub-tabs return to My Recordings, top-level returns to Home.
- **Highlights list** is cleaner — the per-card stats clutter (likes / comments) has been removed so each row reads as title + status.
- **Find Recordings panel** has dropped the "Venues are taken from your own recordings…" helper line for a tighter layout.
- **Payment History** spacing tightened so the first transaction sits closer to the header, matching the rest of the profile screens.
- **Signup flow** trimmed — the public / private interstitial after OTP is gone; new users land directly on Home and can change visibility later in App Settings.
- **Sessions cards** now lead with paid-state at the top-right, alongside the share button, mirroring the Recordings thumbnail badge.
