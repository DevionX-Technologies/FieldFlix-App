import { Routes, Route, useLocation } from 'react-router-dom'
import SplashScreen from './screens/SplashScreen'
import LoginScreen from './screens/LoginScreen'
import OtpScreen from './screens/OtpScreen'
import SignupScreen from './screens/SignupScreen'
import AccountTypeScreen from './screens/AccountTypeScreen'
import HomeScreen from './screens/HomeScreen'
import NotificationsScreen from './screens/NotificationsScreen'
import ScanQrScreen from './screens/ScanQrScreen'
import RecordingTimeScreen from './screens/RecordingTimeScreen'
import RecordingActiveScreen from './screens/RecordingActiveScreen'
import RecordingsScreen from './screens/RecordingsScreen'
import ProfileScreen from './screens/ProfileScreen'
import ProfileNotificationSettingsScreen from './screens/ProfileNotificationSettingsScreen'
import ProfileAppSettingsScreen from './screens/ProfileAppSettingsScreen'
import ProfilePrivacyScreen from './screens/ProfilePrivacyScreen'
import ProfilePremiumScreen from './screens/ProfilePremiumScreen'
import ProfilePaymentHistoryScreen from './screens/ProfilePaymentHistoryScreen'
import ProfileRateUsScreen from './screens/ProfileRateUsScreen'
import ProfileContactUsScreen from './screens/ProfileContactUsScreen'
import FlixShortsScreen from './screens/FlixShortsScreen'
import SessionsScreen from './screens/SessionsScreen'

function App() {
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  return (
    <div className="flex min-h-dvh items-start justify-center bg-black">
      <div
        className={
          isLogin
            ? 'relative min-h-dvh w-full max-w-[402px] overflow-x-hidden overflow-y-auto bg-black'
            : 'relative h-dvh w-full max-w-[402px] overflow-hidden bg-[#020617]'
        }
      >
        <Routes key={location.pathname}>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/otp" element={<OtpScreen />} />
          <Route path="/signup" element={<SignupScreen />} />
          <Route path="/account-type" element={<AccountTypeScreen />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/sessions" element={<SessionsScreen />} />
          <Route path="/notifications" element={<NotificationsScreen />} />
          <Route path="/scan" element={<ScanQrScreen />} />
          <Route path="/recording-time" element={<RecordingTimeScreen />} />
          <Route path="/recording-active" element={<RecordingActiveScreen />} />
          <Route path="/flixshorts" element={<FlixShortsScreen />} />
          <Route path="/recordings" element={<RecordingsScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/profile/notification-settings" element={<ProfileNotificationSettingsScreen />} />
          <Route path="/profile/app-settings" element={<ProfileAppSettingsScreen />} />
          <Route path="/profile/privacy" element={<ProfilePrivacyScreen />} />
          <Route path="/profile/premium" element={<ProfilePremiumScreen />} />
          <Route path="/profile/payment-history" element={<ProfilePaymentHistoryScreen />} />
          <Route path="/profile/rate-us" element={<ProfileRateUsScreen />} />
          <Route path="/profile/contact-us" element={<ProfileContactUsScreen />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
