"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import daLogo from "../../../../public/New Logo.png";
import { Eye, EyeOff, ShieldCheck, Globe, Zap } from "lucide-react";
import s from "./login.module.css";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isApproved = searchParams.get("approved") === "1";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(
    authError === "CredentialsSignin" ? "Invalid email or password. Please try again."
    : authError === "pending_approval" ? "Your account is pending admin approval."
    : authError ? "Authentication failed." : ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  }

  return (
    <div className={s.page}>
      {/* Background decorations */}
      <div className={s.bgOrb1} />
      <div className={s.bgOrb2} />
      <div className={s.bgOrb3} />
      <div className={s.ring1} />
      <div className={s.ring2} />
      <div className={s.sparkle1} />
      <div className={s.sparkle2} />
      <div className={s.sparkle3} />
      <div className={s.sparkle4} />
      <div className={s.sparkle5} />
      <div className={s.sparkle6} />
      <div className={s.sparkle7} />
      <div className={s.sparkle8} />
      <div className={s.leaf1}>🌿</div>
      <div className={s.leaf2}>🌾</div>
      <div className={s.leaf3}>🍃</div>

      <div className={s.container}>
        <div className={s.mainCard}>
          <div className={s.logoWrap}>
            <div className={s.logoImgWrap}>
              <Image src={daLogo} alt="DA CALABARZON Logo" className={s.logoImg} width={100} height={100} />
            </div>
            <div className={s.logoText}>DA CALABARZON</div>
            <div className={s.logoSub}>Employee Portal · AGRI COMM</div>
          </div>

          {error && <div className={s.errorBox}>{error}</div>}
          {isApproved && !error && <div className={s.successBox}>Your account has been approved! You can now log in.</div>}

          <form className={s.form} onSubmit={handleSubmit} noValidate>
            <div className={s.inputWrap}>
              <input id="login-email" type="email" className={s.input}
                placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className={s.inputWrap}>
              <input id="login-password" type={showPass ? "text" : "password"} className={s.input}
                placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                style={{ paddingRight: "44px" }} />
              <button type="button" className={s.eyeBtn} onClick={() => setShowPass(!showPass)} aria-label="Toggle password visibility">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className={s.optionsRow}>
              <label className={s.rememberLabel}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                Keep me signed in for 30 days
              </label>
              <Link href="/forgot-password" className={s.forgotLink}>Forgot password?</Link>
            </div>
            <button type="submit" className={s.submitBtn} disabled={loading}>
              {loading ? "Signing in..." : "Sign In to Workspace"}
            </button>
          </form>

          <div className={s.divider}>
            <div className={s.dividerLine} />
            <span className={s.dividerText}>Secured by</span>
            <div className={s.dividerLine} />
          </div>
          <div className={s.badges}>
            <div className={s.badge}><ShieldCheck size={12} /> End-to-End Encrypted</div>
            <div className={s.badge}><Globe size={12} /> DA Intranet</div>
            <div className={s.badge}><Zap size={12} /> Data Privacy Act</div>
          </div>
          <p className={s.footer}>For authorized DA CALABARZON employees only. Unauthorized access is prohibited.</p>
        </div>

        <div className={s.subCard}>
          <span>Do not have an account?</span>
          <Link href="/register" className={s.registerLink}>Register</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
