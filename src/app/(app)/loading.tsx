import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      width: '100%',
      color: 'var(--text-secondary)'
    }}>
      <Loader2 className="spinner" size={48} style={{ color: 'var(--primary)' }} />
    </div>
  );
}
