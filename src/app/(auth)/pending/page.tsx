"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Clock, ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import daLogo from "../../../../public/Agri Logo.png";
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
    <div className={styles.splitPage}>
      <main className={styles.rightPanel} style={{ width: '100%', maxWidth: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className={styles.rightBlob1} />
        <div className={styles.rightBlob2} />
        <div className={styles.rightGrid} />

        <div className={styles.formCard} style={{ maxWidth: 500, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <Image
              src={daLogo}
              alt="DA Logo"
              width={80}
              height={80}
              style={{ objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ background: 'var(--brand-muted)', color: 'var(--brand)', padding: 16, borderRadius: '50%' }}>
              <Clock size={48} />
            </div>
          </div>

          <h1 className={styles.formTitle}>Account Pending Approval</h1>
          
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginTop: 24, marginBottom: 24, textAlign: 'left' }}>
            <p style={{ color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.6 }}>
              Your account has been successfully created with the email <strong>{email}</strong>.
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              For security purposes, the Department of Agriculture requires an administrator to verify and approve your account before you can log in.
            </p>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: 16, borderRadius: 8 }}>
              <ShieldAlert size={20} color="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ color: '#ca8a04', fontWeight: 600, margin: 0, fontSize: 14 }}>Please wait</p>
                <p style={{ color: '#a16207', margin: 0, fontSize: 13, marginTop: 4 }}>
                  Keep this page open. We are automatically checking your status every few seconds. You will be redirected to the login page as soon as you are approved.
                </p>
              </div>
            </div>
          </div>

          <Link href="/login" className={styles.submitBtn} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', display: 'inline-flex', justifyContent: 'center' }}>
            <ArrowLeft size={16} /> Return to Login
          </Link>
        </div>
      </main>
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
