"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, Save } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [unit, setUnit] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("");
  const [activeTab, setActiveTab] = useState("preferences");
  
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  useEffect(() => {
    setMounted(true);
    try {
      const b = localStorage.getItem("agritalk_blockedUsers");
      if (b) setBlockedUserIds(JSON.parse(b));
    } catch(e) {}
  }, []);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const [res, usersRes] = await Promise.all([
          fetch("/api/users/me"),
          fetch("/api/users")
        ]);
        const data = await res.json();
        const usersData = await usersRes.json();
        
        if (data.user) {
          setName(data.user.name || "");
          setEmail(data.user.email || "");
          setJobTitle(data.user.jobTitle || "");
          setDepartment(data.user.department || "");
          setUnit(data.user.unit || "");
          setAvatar(data.user.avatar || "");
        }
        if (usersData.users) {
          setAllUsers(usersData.users);
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setFetching(false);
      }
    }
    fetchProfile();
  }, []);

  const handleUnblock = (id: string) => {
    const next = blockedUserIds.filter(userId => userId !== id);
    setBlockedUserIds(next);
    localStorage.setItem("agritalk_blockedUsers", JSON.stringify(next));
    // Optional: trigger reload to sync sidebar
    setTimeout(() => window.location.reload(), 300);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("File is too large. Please select an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatar(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          jobTitle,
          avatar,
          password: password ? password : undefined
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Profile updated successfully!");
        setPassword(""); // Clear password field
        // Page should refresh or just display updated info
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setError(data.error || "Failed to update profile");
      }
    } catch (e) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const initials = name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  if (fetching) {
    return <div className={styles.settingsPage}><div className="skeleton" style={{height: 400, width: '100%', maxWidth: 600, borderRadius: 24}}></div></div>;
  }

  return (
    <div className={styles.settingsPage}>
      <div className={styles.settingsHeader}>
        <h1 className={styles.settingsTitle}>Account Settings</h1>
        <p className={styles.settingsSub}>Manage your profile details and preferences</p>
      </div>

      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('profile')}
        >Profile</button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'preferences' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('preferences')}
        >Preferences</button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'privacy' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('privacy')}
        >Privacy & Blocking</button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'security' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('security')}
        >Security</button>
      </div>

      <div className={styles.settingsCard}>
        {message && <div className={styles.successMessage}>{message}</div>}
        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSave}>
          {activeTab === 'profile' && (
            <>
              <div className={styles.avatarSection}>
                {avatar ? (
                  <img src={avatar} alt="Profile" className={styles.avatarPreview} />
                ) : (
                  <div className={styles.avatarPreview}>{initials}</div>
                )}
                <div className={styles.avatarActions}>
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={16} />
                    Change Photo
                  </button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    style={{ display: "none" }} 
                    onChange={handleFileChange}
                  />
                  <span className={styles.avatarHint}>JPG, GIF or PNG. Max size of 2MB.</span>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className="form-label">Division</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="input"
                    placeholder="e.g. PMED"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className="form-label">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="input"
                    placeholder="e.g. MIS"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="input" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label className="form-label">Position / Job Title</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={jobTitle} 
                    onChange={e => setJobTitle(e.target.value)} 
                    placeholder="e.g. Administrative Aide"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'preferences' && (
            <div className={styles.formGrid}>
               <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                 <label className="form-label">Theme</label>
                 {mounted && (
                   <select 
                     className="input" 
                     value={theme}
                     onChange={(e) => setTheme(e.target.value)}
                   >
                     <option value="system">System Default</option>
                     <option value="light">Light Mode</option>
                     <option value="dark">Dark Mode</option>
                   </select>
                 )}
               </div>
               <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                 <label className="form-label">Timezone</label>
                 <select className="input">
                   <option>Asia/Manila (PST)</option>
                   <option>UTC</option>
                 </select>
               </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <>
              <h2 className={styles.sectionTitle}>Blocked Users</h2>
              <p className={styles.settingsSub} style={{marginBottom: 16}}>Users in this list are hidden from your direct messages.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {blockedUserIds.length === 0 ? (
                  <div style={{ padding: 24, background: 'var(--bg-input)', borderRadius: 12, textAlign: 'center', color: 'var(--text-muted)' }}>
                    You haven't blocked anyone.
                  </div>
                ) : (
                  blockedUserIds.map(id => {
                    const user = allUsers.find(u => u.id === id);
                    if (!user) return null;
                    return (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--bg-input)', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className={`avatar avatar-md`} style={{ fontSize: 16 }}>
                            {user.avatar ? <img src={user.avatar} alt={user.name} /> : (user.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0,2) : "U")}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.jobTitle || "Member"}</div>
                          </div>
                        </div>
                        <button type="button" className="btn btn-primary" onClick={() => handleUnblock(id)} style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                          Unblock
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <h2 className={styles.sectionTitle}>Change Password</h2>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label className="form-label">New Password</label>
                  <input 
                    type="password" 
                    className="input" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="Leave blank to keep current password"
                  />
                </div>
              </div>
            </>
          )}

          <div className={styles.actionRow}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{width: 16, height: 16}}></span> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
