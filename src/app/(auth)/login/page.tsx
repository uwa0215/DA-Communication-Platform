"use client";
import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import daLogo from "../../../../public/Agri Logo.png";
import {
  Mail, Lock, LogIn, Eye, EyeOff, Sprout,
  CheckCircle, Leaf, Users, MessageSquare, Zap,
  ShieldCheck, TrendingUp, Globe, Star, ArrowRight,
} from "lucide-react";
import styles from "./auth.module.css";



const FEATURES = [
  { icon: <MessageSquare size={16} />, label: "Office Announcements" },
  { icon: <Users size={16} />,         label: "Division Channels" },
  { icon: <Leaf size={16} />,          label: "AgriProgram Updates" },
  { icon: <TrendingUp size={16} />,    label: "Reports & Analytics" },
  { icon: <Globe size={16} />,         label: "5 Provincial Offices" },
  { icon: <Zap size={16} />,           label: "Instant Notifications" },
];

const TESTIMONIAL = {
  quote: "DAChat has greatly improved coordination between our regional office and all five provincial offices. Information is now shared instantly and securely.",
  author: "Engr. Ramon Dela Cruz",
  role: "Regional Director · DA CALABARZON",
};

import { Suspense } from "react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isApproved = searchParams.get("approved") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      setLoading(false);
      if (res?.error) {
        setError(res.error.includes("pending")
          ? "Your account is pending admin approval."
          : "Invalid email or password. Please try again.");
      } else {
        // Redirect immediately
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setLoading(false);
      setError("An unexpected connection error occurred. Please try again.");
      console.error("Login client error:", err);
    }
  }



  return (
    <>
      {/* ════ SIGN-IN PAGE ════ */}
      <div className={styles.splitPage}>

        {/* ── LEFT PANEL ── */}
        <aside className={styles.leftPanel}>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.blob3} />
          <div className={styles.leftGrid} />

          <div className={styles.leftInner}>
            {/* DA Logo + name */}
            <div className={styles.leftLogo}>
              <div className={styles.leftDaLogoWrap}>
                <Image
                  src={daLogo}
                  alt="Department of Agriculture CALABARZON"
                  className={styles.leftDaLogoImg}
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

            {/* headline */}
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
        {/* ── RIGHT PANEL (dark, matching left) ── */}
        <main className={styles.rightPanel}>
          {/* decorative blobs mirroring left */}
          <div className={styles.rightBlob1} />
          <div className={styles.rightBlob2} />
          <div className={styles.rightGrid} />

          <div className={styles.formCard}>


            {/* heading */}
            <div className={styles.formHeadingBlock}>
              <div className={styles.formHeadingBadge}><ShieldCheck size={14} /> DA CALABARZON Employee Portal</div>
              <h1 className={styles.formTitle}>Good day! 👋</h1>
              <p className={styles.formSub}>Sign in with your official DA CALABARZON employee credentials</p>
            </div>

            {/* error */}
            {error && (
              <div className={styles.formError} role="alert">
                <span className={styles.formErrorDot} />
                {error}
              </div>
            )}
            
            {isApproved && !error && (
              <div className={styles.formError} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#15803d', border: '1px solid rgba(34, 197, 94, 0.2)' }} role="alert">
                <span className={styles.formErrorDot} style={{ background: '#22c55e' }} />
                Your account has been approved! You can now log in.
              </div>
            )}

            {/* form */}
            <form onSubmit={handleSubmit} className={styles.formBody} noValidate>

              {/* email */}
              <div className={styles.fieldGroup}>
                <label htmlFor="login-email" className={styles.fieldLabel}>
                  <Mail size={14} /> Email address
                </label>
                <div className={styles.fieldWrap}>
                  <input
                    id="login-email"
                    type="email"
                    className={styles.fieldInput}
                    placeholder="you@da.gov.ph"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  {email && <div className={styles.fieldCheck}><CheckCircle size={15} /></div>}
                </div>
              </div>

              {/* password */}
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="login-password" className={styles.fieldLabel}>
                    <Lock size={14} /> Password
                  </label>
                  <button type="button" className={styles.forgotBtn}>Forgot password?</button>
                </div>
                <div className={styles.fieldWrap}>
                  <input
                    id="login-password"
                    type={showPass ? "text" : "password"}
                    className={styles.fieldInput}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPass(!showPass)}
                    aria-label="Toggle password visibility"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* remember me */}
              <label className={styles.rememberRow}>
                <input type="checkbox" className={styles.rememberCheck} />
                <span className={styles.rememberCustom} />
                <span className={styles.rememberLabel}>Keep me signed in for 30 days</span>
              </label>

              {/* submit */}
              <button id="login-btn" type="submit" className={styles.submitBtn} disabled={loading}>
                {loading
                  ? <><span className={styles.btnSpinner} /> Signing in…</>
                  : <><LogIn size={17} /> Sign In to Workspace</>}
              </button>

              <p className={styles.formTopBarLink} style={{ textAlign: "center", marginTop: "16px", marginBottom: "0" }}>
                Need an account?&nbsp;
                <Link href="/register" className={styles.formTopBarAction}>
                  Register <ArrowRight size={12} />
                </Link>
              </p>

              {/* divider */}
              <div className={styles.divider}><span>secured by</span></div>

              {/* trust badges */}
              <div className={styles.trustBadges}>
                <div className={styles.trustBadge}><ShieldCheck size={13} /> End-to-End Encrypted</div>
                <div className={styles.trustBadge}><Globe size={13} /> DA Intranet</div>
                <div className={styles.trustBadge}><Zap size={13} /> Data Privacy Act</div>
              </div>

            </form>

            {/* footer */}
            <p className={styles.formFooter}>
              For authorized DA CALABARZON employees only. Unauthorized access is prohibited.
              &nbsp;<a href="#" className={styles.formFooterLink}>Data Privacy Act</a>&nbsp;applies.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
