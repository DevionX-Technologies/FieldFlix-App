import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden flex flex-col items-center">
      {/* 1. BACKGROUND — Full-screen absolute image layer */}
      <div className="absolute inset-0 z-0">
        <img
          src="/image15.jpeg"
          alt=""
          className="w-full h-full object-cover"
        />
        {/* Balanced gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.85) 100%)",
          }}
        />
      </div>

      {/* 2. MAIN CONTENT LAYOUT — Shifted lower based on user request */}
      <div className="relative z-10 w-full h-full flex flex-col items-center px-6 overflow-y-auto">
        {/* 3. INITIAL SPACER — Move header to where the box previously started (~40vh) */}
        <div className="h-[40dvh] shrink-0" />

        {/* 4. HEADER — Positioned in the middle of the screen */}
        <div className="text-center w-full">
          <h1
            className="text-white"
            style={{
              fontFamily: "'Inter Tight', Inter, sans-serif",
              fontSize: 48,
              fontWeight: 800,
              fontStyle: "italic",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              textShadow:
                "0 0 40px rgba(34, 197, 94, 0.6), 0 2px 10px rgba(0,0,0,0.9)",
            }}
          >
            Create Your Account
          </h1>
          <p
            className="mt-4 text-[17px] font-medium text-white/90"
            style={{ textShadow: "0 1px 12px rgba(0,0,0,0.6)" }}
          >
            Start tracking your performance today
          </p>
        </div>

        {/* 5. INTERMEDIATE GAP */}
        <div className="h-8 shrink-0" />

        {/* 6. FORM CARD CONTAINER — extra vertical padding; pills inset so they don’t touch the green border */}
        <div
          className="w-full max-w-[420px] rounded-[32px] mb-20"
          style={{
            background: "rgba(5, 12, 30, 0.45)", // Translucent background
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            border: "2px solid rgba(34, 197, 94, 0.65)",
            boxShadow: "0 0 40px rgba(34, 197, 94, 0.1)",
            paddingTop: 32,
            paddingBottom: 32,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          {/* Pills + button: extra horizontal inset so capsules don’t touch the green border */}
          <div className="flex flex-col gap-5 px-5 sm:px-6">
            {/* Full Name Pill */}
            <div
              className="flex w-full items-center gap-4 rounded-full px-5"
              style={{
                height: 58,
                background: "rgba(0,0,0,0.5)",
                border: "1.2px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <svg
                className="h-[20px] w-[20px] shrink-0 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <input
                type="text"
                autoComplete="name"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="ff-input min-w-0 flex-1 bg-transparent text-[16px] text-white placeholder:text-white/30 outline-none"
              />
            </div>

            {/* Mobile Number Pill */}
            <div
              className="flex w-full items-center gap-4 rounded-full px-5"
              style={{
                height: 58,
                background: "rgba(0,0,0,0.5)",
                border: "1.2px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <svg
                className="h-[20px] w-[20px] shrink-0 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="ff-input min-w-0 flex-1 bg-transparent text-[16px] text-white placeholder:text-white/30 outline-none"
              />
            </div>

            {/* Get OTP Pill */}
            <button
              type="button"
              onClick={() => navigate("/otp")}
              className="w-full shrink-0 rounded-full text-[17px] font-bold text-white transition-all active:scale-[0.98]"
              style={{
                height: 58,
                background: "linear-gradient(180deg, #4ade80 0%, #22c55e 100%)",
                boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)",
              }}
            >
              Get OTP
            </button>
          </div>

          {/* Log in link — same inset as pills; margin clears button; card pb clears bottom border */}
          <div
            className="mt-12 px-5 text-center text-[15px] font-medium sm:px-6"
            style={{ color: "rgba(255, 255, 255, 0.6)" }}
          >
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="border-none bg-transparent p-0 text-[15px] font-bold"
              style={{ color: "#22c55e", cursor: "pointer" }}
            >
              Log in
            </button>
          </div>
        </div>

        {/* 8. BOTTOM GAP */}
        <div className="h-10 shrink-0" />
      </div>
    </div>
  );
}
