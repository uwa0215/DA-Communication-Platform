import styles from "../../../dashboard/dashboard.module.css";

export default function ChannelLoading() {
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%', gap: 20 }}>
      {/* Header skeleton */}
      <div className="skeleton" style={{ width: 250, height: 32, borderRadius: 8 }} />
      {/* Messages area skeleton */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: '80%', height: 24, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
      {/* Input skeleton */}
      <div className="skeleton" style={{ width: '100%', height: 60, borderRadius: 8, marginTop: 10 }} />
    </div>
  );
}
