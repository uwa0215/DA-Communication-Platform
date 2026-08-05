"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import daLogo from "../../../../public/Agri Logo.png";
import { User, Mail, Lock, Briefcase, Building2, Eye, EyeOff, UserPlus, ArrowLeft, ShieldCheck, Globe, Zap } from "lucide-react";
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
    <>
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
              <div className={styles.formHeadingBadge}><ShieldCheck size={14} /> Employee Registration</div>
              <h1 className={styles.formTitle}>Create account</h1>
              <p className={styles.formSub}>Join the official DA CALABARZON workspace</p>
            </div>

            {error && (
              <div className={styles.formError} role="alert">
                <span className={styles.formErrorDot} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.formBody} noValidate>
              
              <div className={styles.fieldGroup}>
                <label htmlFor="reg-name" className={styles.fieldLabel}><User size={14} /> Full Name</label>
                <div className={styles.fieldWrap}>
                  <input id="reg-name" type="text" className={styles.fieldInput}
                    placeholder="Juan Dela Cruz" value={form.name}
                    onChange={e => update("name", e.target.value)} required />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="reg-email" className={styles.fieldLabel}><Mail size={14} /> Email address</label>
                <div className={styles.fieldWrap}>
                  <input id="reg-email" type="email" className={styles.fieldInput}
                    placeholder="you@da.gov.ph" value={form.email}
                    onChange={e => update("email", e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="reg-jobtitle" className={styles.fieldLabel}><Briefcase size={14} /> Job Title</label>
                  <div className={styles.fieldWrap}>
                    <input id="reg-jobtitle" type="text" className={styles.fieldInput}
                      placeholder="e.g. Agriculturist II" value={form.jobTitle}
                      onChange={e => update("jobTitle", e.target.value)} />
                  </div>
                </div>
                
                <div className={styles.fieldGroup}>
                  <label htmlFor="reg-dept" className={styles.fieldLabel}><Building2 size={14} /> Division</label>
                  <div className={styles.fieldWrap}>
                    <input id="reg-dept" type="text" className={styles.fieldInput}
                      placeholder="e.g. PMED" value={form.department}
                      onChange={e => update("department", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="reg-unit" className={styles.fieldLabel}><Building2 size={14} /> Unit</label>
                <div className={styles.fieldWrap}>
                  <input id="reg-unit" type="text" className={styles.fieldInput}
                    placeholder="e.g. MIS" value={form.unit}
                    onChange={e => update("unit", e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="reg-password" className={styles.fieldLabel}><Lock size={14} /> Password</label>
                  <div className={styles.fieldWrap}>
                    <input id="reg-password" type={showPass ? "text" : "password"} className={styles.fieldInput}
                      placeholder="Min. 6 chars" value={form.password}
                      onChange={e => update("password", e.target.value)} required />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="reg-confirm" className={styles.fieldLabel}><Lock size={14} /> Confirm</label>
                  <div className={styles.fieldWrap}>
                    <input id="reg-confirm" type={showPass ? "text" : "password"} className={styles.fieldInput}
                      placeholder="Repeat password" value={form.confirmPassword}
                      onChange={e => update("confirmPassword", e.target.value)} required />
                  </div>
                </div>
              </div>

              <button id="register-btn" type="submit" className={styles.submitBtn} disabled={loading} style={{ marginTop: '8px' }}>
                {loading
                  ? <><span className={styles.btnSpinner} /> Creating account…</>
                  : <><UserPlus size={17} /> Create Account</>}
              </button>

              <p className={styles.formTopBarLink} style={{ textAlign: "center", marginTop: "16px", marginBottom: "0" }}>
                Already have an account?&nbsp;
                <Link href="/login" className={styles.formTopBarAction}>
                  <ArrowLeft size={12} /> Sign In
                </Link>
              </p>

              <div className={styles.divider}><span>secured by</span></div>
              <div className={styles.trustBadges}>
                <div className={styles.trustBadge}><ShieldCheck size={13} /> End-to-End Encrypted</div>
                <div className={styles.trustBadge}><Globe size={13} /> DA Intranet</div>
                <div className={styles.trustBadge}><Zap size={13} /> Data Privacy Act</div>
              </div>
            </form>

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
