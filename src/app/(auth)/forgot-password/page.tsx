"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import daLogo from "../../../../public/New Logo.png";
import { Mail, ShieldCheck, ArrowLeft, KeyRound } from "lucide-react";
import loginStyles from "../login/login.module.css";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to request reset code.");
      } else {
        setStatus("success");
        setMessage(data.message || "Reset code sent! Check your email inbox.");
        setTimeout(() => router.push("/reset-password"), 2000);
      }
    } catch {
      setStatus("error");
      setMessage("An unexpected connection error occurred.");
    }
  }

  return (
    <div className={loginStyles.page}>
      <div className={loginStyles.container}>
        <div className={loginStyles.mainCard}>
          {/* Logo */}
          <div className={loginStyles.logoWrap}>
            <div className={loginStyles.logoImgWrap}>
              <Image src={daLogo} alt="DA CALABARZON Logo" className={loginStyles.logoImg} width={100} height={100} />
            </div>
            <div className={loginStyles.logoText}>DA CALABARZON</div>
            <div className={loginStyles.logoSub}>Password Recovery</div>
          </div>

          {/* Icon accent */}
          <div style={{
            width: 56, height: 56, borderRadius: "16px",
            background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2))",
            border: "1px solid rgba(16,185,129,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "20px", boxShadow: "0 0 20px rgba(16,185,129,0.2)"
          }}>
            <KeyRound size={24} color="#10b981" />
          </div>

          <h2 style={{ color: "#f0f9ff", fontWeight: 700, fontSize: "20px", margin: "0 0 8px", textAlign: "center" }}>
            Forgot your password?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", textAlign: "center", marginBottom: "24px", lineHeight: 1.6 }}>
            Enter your registered email address and we will send you a 6-digit reset code.
          </p>

          {status === "error" && <div className={loginStyles.errorBox}>{message}</div>}
          {status === "success" && <div className={loginStyles.successBox}>{message}</div>}

          <form className={loginStyles.form} onSubmit={handleSubmit} noValidate>
            <div className={loginStyles.inputWrap}>
              <input
                id="reset-email"
                type="email"
                className={loginStyles.input}
                placeholder="you@da.gov.ph"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            <button type="submit" className={loginStyles.submitBtn} disabled={status === "loading"}>
              {status === "loading" ? "Sending reset code..." : "Send Reset Code"}
            </button>
          </form>

          <div className={loginStyles.divider}>
            <div className={loginStyles.dividerLine} />
            <span className={loginStyles.dividerText}>Secured by DA</span>
            <div className={loginStyles.dividerLine} />
          </div>

          <p className={loginStyles.footer}>
            For authorized DA CALABARZON employees only.
          </p>
        </div>

        <div className={loginStyles.subCard}>
          <span>Remembered your password?</span>
          <Link href="/login" className={loginStyles.registerLink}>Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}

