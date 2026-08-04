"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, User, Mail, Lock, Briefcase, Building2, Eye, EyeOff, UserPlus, Sprout } from "lucide-react";
import styles from "../login/auth.module.css";

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
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        jobTitle: form.jobTitle,
        department: form.department,
        unit: form.unit,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed.");
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authBg} />
      <div className={`${styles.authCard} ${styles.authCardWide}`}>
        <div className={styles.authLogo}>
          <div className={styles.logoIcon}>
            <Sprout size={28} />
          </div>
          <span className={styles.logoText} style={{ fontSize: '20px' }}>AgriTalk</span>
        </div>

        <h1 className={styles.authTitle}>Create your account</h1>
        <p className={styles.authSub}>Join your company workspace</p>

        {error && <div className={styles.authError}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className={styles.inputWrap}>
                <User size={16} className={styles.inputIcon} />
                <input id="reg-name" type="text" className={`input ${styles.inputPadded}`}
                  placeholder="John Smith" value={form.name}
                  onChange={e => update("name", e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <div className={styles.inputWrap}>
                <Mail size={16} className={styles.inputIcon} />
                <input id="reg-email" type="email" className={`input ${styles.inputPadded}`}
                  placeholder="you@company.com" value={form.email}
                  onChange={e => update("email", e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Job Title</label>
              <div className={styles.inputWrap}>
                <Briefcase size={16} className={styles.inputIcon} />
                <input id="reg-jobtitle" type="text" className={`input ${styles.inputPadded}`}
                  placeholder="Administrative Aide" value={form.jobTitle}
                  onChange={e => update("jobTitle", e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Division</label>
              <div className={styles.inputWrap}>
                <Building2 size={16} className={styles.inputIcon} />
                <input id="reg-dept" type="text" className={`input ${styles.inputPadded}`}
                  placeholder="PMED" value={form.department}
                  onChange={e => update("department", e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Unit</label>
              <div className={styles.inputWrap}>
                <Building2 size={16} className={styles.inputIcon} />
                <input id="reg-unit" type="text" className={`input ${styles.inputPadded}`}
                  placeholder="MIS" value={form.unit}
                  onChange={e => update("unit", e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className={styles.inputWrap}>
                <Lock size={16} className={styles.inputIcon} />
                <input id="reg-password" type={showPass ? "text" : "password"}
                  className={`input ${styles.inputPadded} ${styles.inputPaddedRight}`}
                  placeholder="Min. 6 characters" value={form.password}
                  onChange={e => update("password", e.target.value)} required />
                <button type="button" className={styles.togglePass} onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className={styles.inputWrap}>
                <Lock size={16} className={styles.inputIcon} />
                <input id="reg-confirm" type={showPass ? "text" : "password"}
                  className={`input ${styles.inputPadded}`}
                  placeholder="Repeat password" value={form.confirmPassword}
                  onChange={e => update("confirmPassword", e.target.value)} required />
              </div>
            </div>
          </div>

          <button id="register-btn" type="submit" className={`btn btn-primary ${styles.authBtn}`} disabled={loading}>
            {loading ? <span className="spinner" /> : <><UserPlus size={16} /> Create Account</>}
          </button>
        </form>

        <p className={styles.authFooter}>
          Already have an account?{" "}
          <Link href="/login" className={styles.authLink}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
