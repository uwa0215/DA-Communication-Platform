"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import daLogo from "../../../../public/New Logo.png";
import { Lock, ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import styles from "../login/auth.module.css";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing password reset token.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setStatus("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to reset password.");
      } else {
        setStatus("success");
        setMessage("Password reset successfully! You can now log in.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
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
            <h1 className={styles.formTitle}>Create New Password</h1>
            <p className={styles.formSub}>Please enter your new password below.</p>
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
              <label htmlFor="new-password" className={styles.fieldLabel}>
                <Lock size={14} /> New Password
              </label>
              <div className={styles.fieldWrap}>
                <input
                  id="new-password"
                  type={showPass ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  className={styles.fieldInput}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={!token || status === "success"}
                  required
                />
                <button
                  type="button"
                  className={styles.fieldToggle}
                  onClick={() => setShowPass(!showPass)}
                  disabled={!token || status === "success"}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="confirm-password" className={styles.fieldLabel}>
                <Lock size={14} /> Confirm New Password
              </label>
              <div className={styles.fieldWrap}>
                <input
                  id="confirm-password"
                  type={showConfirmPass ? "text" : "password"}
                  placeholder="Re-enter your password"
                  className={styles.fieldInput}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={!token || status === "success"}
                  required
                />
                <button
                  type="button"
                  className={styles.fieldToggle}
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  disabled={!token || status === "success"}
                  aria-label={showConfirmPass ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={!token || status === "loading" || status === "success"}>
              {status === "loading" ? "Updating..." : "Reset Password"}
            </button>
            
            {status === "success" && (
              <div className={styles.registerPrompt} style={{ marginTop: '1rem' }}>
                <Link href="/login" className={styles.registerLink}>
                  Go to Login <ArrowRight size={12} style={{ display: 'inline', marginLeft: 4 }} />
                </Link>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
