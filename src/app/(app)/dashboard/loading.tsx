import { Users, Hash, CalendarDays, TrendingUp } from "lucide-react";
import styles from "./dashboard.module.css";

export default function DashboardLoading() {
  return (
    <div className={styles.dashboard}>
      {/* Hero Section Skeleton */}
      <section className={styles.hero} style={{ opacity: 0.7 }}>
        <div className={styles.heroContent}>
          <div className={styles.heroTextBlock}>
            <div className="skeleton" style={{ width: 200, height: 24, borderRadius: 12, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: 300, height: 40, borderRadius: 8, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: 400, height: 20, borderRadius: 4 }} />
          </div>
          <div className={styles.heroLogo}>
            <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%' }} />
          </div>
        </div>
      </section>

      {/* Stats Row Skeleton */}
      <section className={styles.statsRow}>
        {[Users, Hash, CalendarDays, TrendingUp].map((Icon, i) => (
          <div key={i} className={styles.statCard}>
            <div className={`${styles.statIcon} skeleton`} style={{ width: 40, height: 40, borderRadius: 8 }} />
            <div className={styles.statInfo}>
              <div className="skeleton" style={{ width: 40, height: 24, borderRadius: 4, marginBottom: 4 }} />
              <div className="skeleton" style={{ width: 80, height: 16, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </section>

      {/* Two Column Skeleton */}
      <div className={styles.twoCol}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className="skeleton" style={{ width: 100, height: 20, borderRadius: 4 }} />
          </div>
          <div className={styles.upcomingList}>
            {[1, 2, 3].map(i => (
              <div key={i} className={styles.upcomingItem}>
                <div className="skeleton" style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '80%', height: 16, borderRadius: 4, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: '60%', height: 12, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className="skeleton" style={{ width: 120, height: 20, borderRadius: 4 }} />
          </div>
          <div className={styles.activityList}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={styles.activityItem}>
                <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '40%', height: 14, borderRadius: 4, marginBottom: 6 }} />
                  <div className="skeleton" style={{ width: '90%', height: 14, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
