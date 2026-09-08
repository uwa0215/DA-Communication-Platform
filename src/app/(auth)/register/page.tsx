"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import daLogo from "../../../../public/New Logo.png";
import { User, Mail, Lock, Briefcase, Building2, Eye, EyeOff, ShieldCheck, Globe, Zap } from "lucide-react";
import s from "../login/login.module.css";
import rs from "./register.module.css";

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

      <div className={rs.container}>
        <div className={rs.mainCard}>
          {/* Logo with proper overflow to show rings */}
          <div className={s.logoWrap}>
            <div className={rs.logoImgWrap}>
              <Image src={daLogo} alt="DA CALABARZON Logo" className={s.logoImg} width={100} height={100} />
            </div>
            <div className={s.logoText}>DA CALABARZON</div>
            <div className={s.logoSub}>Create your employee account</div>
          </div>

          {error && <div className={s.errorBox}>{error}</div>}

          <form className={rs.form} onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className={rs.fieldGroup}>
              <label className={rs.fieldLabel}><User size={13} /> Full Name</label>
              <input id="reg-name" type="text" className={s.input}
                placeholder="Juan Dela Cruz" value={form.name}
                onChange={e => update("name", e.target.value)} required />
            </div>

            {/* Email */}
            <div className={rs.fieldGroup}>
              <label className={rs.fieldLabel}><Mail size={13} /> Email address</label>
              <input id="reg-email" type="email" className={s.input}
                placeholder="you@da.gov.ph" value={form.email}
                onChange={e => update("email", e.target.value)} required />
            </div>

            {/* Job Title + Division */}
            <div className={rs.twoCol}>
              <div className={rs.fieldGroup}>
                <label className={rs.fieldLabel}><Briefcase size={13} /> Job Title</label>
                <input id="reg-jobtitle" type="text" className={s.input}
                  placeholder="e.g. Agriculturist II" value={form.jobTitle}
                  onChange={e => update("jobTitle", e.target.value)} />
              </div>
              <div className={rs.fieldGroup}>
                <label className={rs.fieldLabel}><Building2 size={13} /> Division</label>
                <input id="reg-dept" type="text" className={s.input}
                  placeholder="e.g. PMED" value={form.department}
                  onChange={e => update("department", e.target.value)} />
              </div>
            </div>

            {/* Unit */}
            <div className={rs.fieldGroup}>
              <label className={rs.fieldLabel}><Building2 size={13} /> Unit</label>
              <input id="reg-unit" type="text" className={s.input}
                placeholder="e.g. MIS" value={form.unit}
                onChange={e => update("unit", e.target.value)} />
            </div>

            {/* Password + Confirm */}
            <div className={rs.twoCol}>
              <div className={rs.fieldGroup}>
                <label className={rs.fieldLabel}><Lock size={13} /> Password</label>
                <div className={s.inputWrap}>
                  <input id="reg-password" type={showPass ? "text" : "password"} className={s.input}
                    placeholder="Min. 6 chars" value={form.password}
                    onChange={e => update("password", e.target.value)} required style={{ paddingRight: "44px" }} />
                  <button type="button" className={s.eyeBtn} onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className={rs.fieldGroup}>
                <label className={rs.fieldLabel}><Lock size={13} /> Confirm</label>
                <input id="reg-confirm" type={showPass ? "text" : "password"} className={s.input}
                  placeholder="Repeat password" value={form.confirmPassword}
                  onChange={e => update("confirmPassword", e.target.value)} required />
              </div>
            </div>

            <button id="register-btn" type="submit" className={s.submitBtn} disabled={loading} style={{ marginTop: "8px" }}>
              {loading ? "Creating account..." : "Create Account"}
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
          <p className={s.footer}>For authorized DA CALABARZON employees only.</p>
        </div>

        <div className={s.subCard}>
          <span>Already have an account?</span>
          <Link href="/login" className={s.registerLink}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
