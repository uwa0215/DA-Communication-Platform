"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import daLogo from "../../../../public/New Logo.png";
import { User, Mail, Lock, Briefcase, Building2, Eye, EyeOff, UserPlus, ShieldCheck, Globe, Zap } from "lucide-react";
import loginStyles from "../login/login.module.css";
import styles from "./register.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", jobTitle: "", department: "", unit: ""
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, email: form.email, password: form.password,
        jobTitle: form.jobTitle, department: form.department, unit: form.unit,
      }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Registration failed."); return; }

    if (data.user?.isApproved) {
      router.push("/login?registered=1");
    } else {
      router.push(`/pending?email=${encodeURIComponent(form.email)}`);
    }
  }

  return (
    <div className={loginStyles.page}>
      <div className={styles.container}>
        <div className={styles.mainCard}>
          {/* Logo */}
          <div className={loginStyles.logoWrap}>
            <div className={loginStyles.logoImgWrap}>
              <Image src={daLogo} alt="DA CALABARZON Logo" className={loginStyles.logoImg} width={80} height={80} />
            </div>
            <div className={loginStyles.logoText}>DA CALABARZON</div>
            <div className={loginStyles.logoSub}>Create your employee account</div>
          </div>

          {error && <div className={loginStyles.errorBox}>{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}><User size={13} /> Full Name</label>
              <input id="reg-name" type="text" className={loginStyles.input}
                placeholder="Juan Dela Cruz" value={form.name}
                onChange={e => update("name", e.target.value)} required />
            </div>

            {/* Email */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}><Mail size={13} /> Email address</label>
              <input id="reg-email" type="email" className={loginStyles.input}
                placeholder="you@da.gov.ph" value={form.email}
                onChange={e => update("email", e.target.value)} required />
            </div>

            {/* Job Title + Division */}
            <div className={styles.twoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}><Briefcase size={13} /> Job Title</label>
                <input id="reg-jobtitle" type="text" className={loginStyles.input}
                  placeholder="e.g. Agriculturist II" value={form.jobTitle}
                  onChange={e => update("jobTitle", e.target.value)} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}><Building2 size={13} /> Division</label>
                <input id="reg-dept" type="text" className={loginStyles.input}
                  placeholder="e.g. PMED" value={form.department}
                  onChange={e => update("department", e.target.value)} />
              </div>
            </div>

            {/* Unit */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}><Building2 size={13} /> Unit</label>
              <input id="reg-unit" type="text" className={loginStyles.input}
                placeholder="e.g. MIS" value={form.unit}
                onChange={e => update("unit", e.target.value)} />
            </div>

            {/* Password + Confirm */}
            <div className={styles.twoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}><Lock size={13} /> Password</label>
                <div className={loginStyles.inputWrap}>
                  <input id="reg-password" type={showPass ? "text" : "password"} className={loginStyles.input}
                    placeholder="Min. 6 chars" value={form.password}
                    onChange={e => update("password", e.target.value)} required style={{ paddingRight: "44px" }} />
                  <button type="button" className={loginStyles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}><Lock size={13} /> Confirm</label>
                <input id="reg-confirm" type={showPass ? "text" : "password"} className={loginStyles.input}
                  placeholder="Repeat password" value={form.confirmPassword}
                  onChange={e => update("confirmPassword", e.target.value)} required />
              </div>
            </div>

            <button id="register-btn" type="submit" className={loginStyles.submitBtn} disabled={loading} style={{ marginTop: "8px" }}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className={loginStyles.divider}>
            <div className={loginStyles.dividerLine} />
            <span className={loginStyles.dividerText}>Secured by</span>
            <div className={loginStyles.dividerLine} />
          </div>
          <div className={loginStyles.badges}>
            <div className={loginStyles.badge}><ShieldCheck size={12} /> End-to-End Encrypted</div>
            <div className={loginStyles.badge}><Globe size={12} /> DA Intranet</div>
            <div className={loginStyles.badge}><Zap size={12} /> Data Privacy Act</div>
          </div>
          <p className={loginStyles.footer}>For authorized DA CALABARZON employees only.</p>
        </div>

        <div className={loginStyles.subCard}>
          <span>Already have an account?</span>
          <Link href="/login" className={loginStyles.registerLink}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
