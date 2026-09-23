"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Clock, ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import daLogo from "../../../../public/New Logo.png";
import styles from "../login/auth.module.css";

function PendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const { data } = useSWR(
    email ? `/api/auth/status?email=${encodeURIComponent(email)}` : null,
    fetcher,
    { refreshInterval: 5000 } // Poll every 5 seconds
  );

  useEffect(() => {
    if (data?.isApproved) {
      router.push("/login?approved=1");
    }
  }, [data, router]);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(145deg, #050e1f 0%, #071a13 50%, #020617 100%)',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto',
      padding: '40px 20px',
      boxSizing: 'border-box'
    }}>
      <div className={styles.rightBlob1} />
      <div className={styles.rightBlob2} />
      <div className={styles.rightGrid} />

      <div className={styles.formCard} style={{ 
        maxWidth: 520, 
        width: '100%', 
        textAlign: 'center', 
        margin: 'auto',
        boxSizing: 'border-box',
        padding: '36px 32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Image
            src={daLogo}
            alt="DA Logo"
            className={`${styles.leftDaLogoImg} theme-logo`}
            width={80}
            height={80}
            style={{ objectFit: 'contain', width: 80, height: 80 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: 14, borderRadius: '50%', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <Clock size={40} />
          </div>
        </div>

        <h1 className={styles.formTitle} style={{ fontSize: 26, marginBottom: 12 }}>Account Pending Approval</h1>
        
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 14, padding: '20px', marginTop: 16, marginBottom: 24, textAlign: 'left' }}>
          <p style={{ color: '#f8fafc', marginBottom: 12, lineHeight: 1.6, fontSize: 14 }}>
            Your account has been successfully created with the email <strong style={{ color: '#10b981' }}>{email}</strong>.
          </p>
          <p style={{ color: '#94a3b8', marginBottom: 16, lineHeight: 1.6, fontSize: 13 }}>
            For security purposes, the Department of Agriculture requires an administrator to verify and approve your account before you can log in.
          </p>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: 14, borderRadius: 10 }}>
            <ShieldAlert size={20} color="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ color: '#facc15', fontWeight: 600, margin: 0, fontSize: 13 }}>Please wait</p>
              <p style={{ color: '#eab308', margin: 0, fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                Keep this page open. We are automatically checking your status every few seconds. You will be redirected to the login page as soon as you are approved.
              </p>
            </div>
          </div>
        </div>

        <Link href="/login" className={styles.submitBtn} style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'inline-flex', justifyContent: 'center', width: '100%', textDecoration: 'none' }}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} /> Return to Login
        </Link>
      </div>
    </div>
  );
}

export default function PendingPage() {
  return (
    <Suspense fallback={null}>
      <PendingContent />
    </Suspense>
  );
}
