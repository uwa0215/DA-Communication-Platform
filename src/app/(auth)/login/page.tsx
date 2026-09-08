"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import daLogo from "../../../../public/New Logo.png";
import { Eye, EyeOff } from "lucide-react";
import loginStyles from "./login.module.css";

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
    authError === "CredentialsSignin"
      ? "Invalid email or password. Please try again."
      : authError === "pending_approval"
        ? "Your account is pending admin approval."
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
    <div className={loginStyles.page}>
      <div className={loginStyles.container}>
        <div className={loginStyles.mainCard}>
          <div className={loginStyles.logoWrap}>
            <Image src={daLogo} alt="DA Logo" className={loginStyles.logoImg} width={80} height={80} />
            <div className={loginStyles.logoText}>DA CALABARZON</div>
          </div>
          {error && <div className={loginStyles.errorBox}>{error}</div>}
          {isApproved && !error && (
            <div className={loginStyles.successBox}>
              Your account has been approved! You can now log in.
            </div>
          )}
          <form className={loginStyles.form} onSubmit={handleSubmit} noValidate>
            <div className={loginStyles.inputWrap}>
              <input
                id="login-email"
                type="email"
                className={loginStyles.input}
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className={loginStyles.inputWrap}>
              <input
                id="login-password"
                type={showPass ? "text" : "password"}
                className={loginStyles.input}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                className={loginStyles.eyeBtn}
                onClick={() => setShowPass(!showPass)}
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className={loginStyles.optionsRow}>
              <label className={loginStyles.rememberLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                Keep me signed in
              </label>
              <Link href="/forgot-password" className={loginStyles.forgotLink}>
                Forgot password?
              </Link>
            </div>
            <button type="submit" className={loginStyles.submitBtn} disabled={loading}>
              {loading ? "Signing in..." : "Log In"}
            </button>
          </form>
          <div className={loginStyles.divider}>
            <div className={loginStyles.dividerLine} />
            <span className={loginStyles.dividerText}>SECURED BY DA</span>
            <div className={loginStyles.dividerLine} />
          </div>
          <p className={loginStyles.footer}>
            For authorized DA CALABARZON employees only.
          </p>
        </div>
        <div className={loginStyles.subCard}>
          <span>Do not have an account?</span>
          <Link href="/register" className={loginStyles.registerLink}>Register</Link>
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
