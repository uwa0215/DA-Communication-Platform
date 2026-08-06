"use client";
import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import daLogo from "../../../../public/Agri Logo.png";
import {
  Mail, Lock, LogIn, Eye, EyeOff, Sprout,
  CheckCircle, Leaf, Users, MessageSquare, Zap,
  ShieldCheck, TrendingUp, Globe, Star, ArrowRight,
} from "lucide-react";
import styles from "./auth.module.css";

/* ─── animated counter ─── */
function useCounter(target: number, duration = 1500, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const pct = Math.min((ts - startTime) / duration, 1);
      setVal(Math.floor(pct * target));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return val;
}

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  /* welcome overlay */
  const [showWelcome, setShowWelcome]   = useState(false);
  const [welcomePhase, setWelcomePhase] = useState(0);
  const [userName, setUserName]         = useState("");
  const [progress, setProgress]         = useState(0);

  /* counters trigger */
  const [panelVisible, setPanelVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setPanelVisible(true); }, { threshold: 0.2 });
    if (panelRef.current) obs.observe(panelRef.current);
    return () => obs.disconnect();
  }, []);

  const c1 = useCounter(800, 1400, panelVisible);
  const c2 = useCounter(99,  1200, panelVisible);
  const c3 = useCounter(6,   1000, panelVisible);

  /* welcome overlay sequence */
  useEffect(() => {
    if (!showWelcome) return;
    const interval = setInterval(() => {
      setProgress(prev => { if (prev >= 100) { clearInterval(interval); return 100; } return prev + 5; });
    }, 40);
    const t1 = setTimeout(() => setWelcomePhase(1), 200);
    const t2 = setTimeout(() => setWelcomePhase(2), 450);
    const t3 = setTimeout(() => setWelcomePhase(3), 750);
    const t4 = setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1200);
    return () => { clearInterval(interval); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [showWelcome, router]);

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
        const name = email.split("@")[0].replace(/[._]/g, " ");
        const fallbackName = name.charAt(0).toUpperCase() + name.slice(1);
        setUserName(fallbackName);
        setShowWelcome(true);

        // Dynamically fetch first name from database to display instead of email prefix
        fetch("/api/users/me")
          .then(r => r.json())
          .then(data => {
            if (data?.user?.name) {
              const firstName = data.user.name.split(" ")[0];
              setUserName(firstName);
            }
          })
          .catch(err => console.error("Error fetching user first name:", err));
      }
    } catch (err: any) {
      setLoading(false);
      setError("An unexpected connection error occurred. Please try again.");
      console.error("Login client error:", err);
    }
  }

  const particles = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      delay: Math.random() * 2, duration: Math.random() * 3 + 2,
    }))
  ).current;

  return (
    <>
      {/* ════ WELCOME OVERLAY ════ */}
      {showWelcome && (
        <div className={styles.welcomeOverlay}>
          <div className={styles.welcomeOrb1} />
          <div className={styles.welcomeOrb2} />
          <div className={styles.welcomeOrb3} />
          <div className={styles.welcomeOrb4} />
          {particles.map(p => (
            <div key={p.id} className={styles.particle} style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size,
              animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`,
            }} />
          ))}
          <div className={styles.welcomeGrid} />
          <div className={styles.welcomeContent}>
            <div className={`${styles.welcomeLogo} ${welcomePhase >= 0 ? styles.fadeInUp : ""}`}>
              <div className={styles.welcomeLogoRing}>
                <div className={styles.welcomeLogoRingInner} />
                {/* DA logo in center of welcome overlay */}
                <div className={styles.welcomeLogoIcon}>
                  <Image 
                    src={daLogo} 
                    alt="DA CALABARZON" 
                    style={{ width: 48, height: 48, objectFit: "contain", borderRadius: "50%", background: "white", padding: 4 }} 
                  />
                </div>
              </div>
              <div className={styles.orbitTrack}>
                <div className={styles.orbitIcon} style={{ "--orbit-deg": "0deg" } as React.CSSProperties}><Leaf size={14} /></div>
                <div className={styles.orbitIcon} style={{ "--orbit-deg": "120deg" } as React.CSSProperties}><Users size={14} /></div>
                <div className={styles.orbitIcon} style={{ "--orbit-deg": "240deg" } as React.CSSProperties}><Zap size={14} /></div>
              </div>
            </div>
            <div className={`${styles.checkBadge} ${welcomePhase >= 1 ? styles.fadeInScale : ""}`}>
              <CheckCircle size={20} /><span>Employee Verified</span>
            </div>
            <div className={`${styles.welcomeTextBlock} ${welcomePhase >= 1 ? styles.fadeInUp : ""}`}>
              <p className={styles.welcomeLabel}>DA CALABARZON · Employee Portal</p>
              <h1 className={styles.welcomeHeading}>Good day, <span className={styles.welcomeName}>{userName}</span>! 🌾</h1>
              <p className={styles.welcomeSub}>Loading your DA CALABARZON workspace...</p>
            </div>
            <div className={`${styles.featureBadges} ${welcomePhase >= 2 ? styles.fadeInUp : ""}`}>
              <div className={styles.featureBadge}><MessageSquare size={14} />Announcements</div>
              <div className={styles.featureBadge}><Users size={14} />Divisions</div>
              <div className={styles.featureBadge}><Leaf size={14} />Programs</div>
              <div className={styles.featureBadge}><Zap size={14} />Alerts</div>
            </div>
            <div className={`${styles.progressWrap} ${welcomePhase >= 2 ? styles.fadeInUp : ""}`}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                <div className={styles.progressGlow} style={{ left: `${progress}%` }} />
              </div>
              <p className={styles.progressLabel}>
                {progress < 40 ? "Authenticating..." : progress < 80 ? "Loading workspace..." : "Almost there..."}
              </p>
            </div>
          </div>
          <div className={styles.cornerTopLeft} />
          <div className={styles.cornerBottomRight} />
        </div>
      )}

      {/* ════ SIGN-IN PAGE ════ */}
      <div className={styles.splitPage}>

        {/* ── LEFT PANEL ── */}
        <aside className={styles.leftPanel} ref={panelRef}>
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
