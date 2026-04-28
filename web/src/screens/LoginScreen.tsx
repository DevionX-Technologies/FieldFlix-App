import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./loginScreen.css";

function PhoneIcon() {
  return (
    <svg
      className="login-field__icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function LoginScreen() {
  const [mobile, setMobile] = useState("");
  const navigate = useNavigate();

  return (
    <div className="login-page-root">
      <div className="main-container">
        <div className="ellipse" />
        <div className="frame" />
        <div className="frame-1" />

        <div className="login-card">
          <div className="login-field">
            <PhoneIcon />
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              className="login-field__input"
              placeholder="Mobile Number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="login-btn-otp"
            onClick={() => navigate("/otp")}
          >
            Get OTP
          </button>
          <p className="login-footer">
            <span className="login-footer__muted">
              Don&apos;t have an account?{" "}
            </span>
            <button
              type="button"
              className="login-footer__link"
              onClick={() => navigate("/signup")}
            >
              Sign up
            </button>
          </p>
        </div>

        <div className="image" />
        <div className="ellipse-3" />
        <div className="frame-4" />
        <div className="ellipse-5" />
        <span className="level-up-game">Level Up Your Game</span>
        <span className="track-analyze-improve">
          Track, analyze, and improve every move
        </span>
        <div className="ellipse-6" />
      </div>
    </div>
  );
}
