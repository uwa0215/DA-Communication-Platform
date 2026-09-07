"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import daLogo from "../../../../public/New Logo.png";
import { Mail, ShieldCheck, ArrowLeft } from "lucide-react";
import styles from "../login/auth.module.css";

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
        setMessage(data.error || "Failed to request reset link.");
      } else {
        setStatus("success");
        setMessage(data.message || "Reset link sent!");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage("An unexpected connection error occurred.");
    }
  }

  return (
    <div className={styles.splitPage}>
      {/* ── LEFT PANEL ── */}
      <aside className={styles.leftPanel}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.blob3} />
        <div className={styles.leftGrid} />

        <div className={styles.leftInner}>
          <div className={styles.leftLogo}>
            <div className={styles.leftDaLogoWrap}>
              <Image
                src={daLogo}
                alt="Department of Agriculture CALABARZON"
                className={`${styles.leftDaLogoImg} theme-logo`}
                width={260}
                height={260}
              />
            </div>
            <div>
              <span className={styles.leftLogoText}>DA CALABARZON</span>
              <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", justifyContent: "center" }}>
                <span className={styles.leftLogoBadge}>Official</span>
                <span className={styles.leftLogoBadge} style={{ background: "rgba(6,182,212,.12)", borderColor: "rgba(6,182,212,.3)", color: "#06b6d4" }}>Region IV-A</span>
              </div>
            </div>
          </div>

          <div className={styles.leftHero}>
            <div className={styles.leftTagline}>🌾 Department of Agriculture · Region IV-A</div>
            <h2 className={styles.leftHeading}>
              The official<br />
              <span className={styles.leftHeadingAccent}>employee portal</span><br />
              for DA CALABARZON
            </h2>
            <p className={styles.leftDesc}>
              AGRI COMM is the secure internal communication platform for all employees
              of the Department of Agriculture CALABARZON — connecting the regional
              office and all five provincial offices.
            </p>
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main className={styles.rightPanel}>
        <div className={styles.rightBlob1} />
        <div className={styles.rightBlob2} />
        <div className={styles.rightGrid} />

        <div className={styles.formCard}>
          <div className={styles.formHeadingBlock}>
            <div className={styles.formHeadingBadge}><ShieldCheck size={14} /> Password Recovery</div>
            <h1 className={styles.formTitle}>Forgot Password?</h1>
            <p className={styles.formSub}>Enter your registered email and we will send you a reset link.</p>
          </div>

          {status === "error" && (
            <div className={styles.formError} role="alert">
              <span className={styles.formErrorDot} />
              {message}
            </div>
          )}
          
          {status === "success" && (
            <div className={styles.formError} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#15803d', border: '1px solid rgba(34, 197, 94, 0.2)' }} role="alert">
              <span className={styles.formErrorDot} style={{ background: '#22c55e' }} />
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.formBody} noValidate>
            <div className={styles.fieldGroup}>
              <label htmlFor="reset-email" className={styles.fieldLabel}>
                <Mail size={14} /> Email address
              </label>
              <div className={styles.fieldWrap}>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="you@da.gov.ph"
                  className={styles.fieldInput}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={status === "loading"}>
              {status === "loading" ? "Sending..." : "Send Reset Link"}
            </button>

            <div className={styles.registerPrompt}>
              Remembered your password?{" "}
              <Link href="/login" className={styles.registerLink}>
                <ArrowLeft size={12} style={{ display: 'inline', marginRight: 4 }} />
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
