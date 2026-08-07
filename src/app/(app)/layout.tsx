import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlobalSearchModal from "@/components/layout/GlobalSearchModal";
import { UIProvider } from "@/components/UIProvider";
import styles from "./app.module.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <UIProvider>
      <div className={styles.appShell}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.blob3} />
        <div className={styles.meshGrid} />
        <Topbar currentUser={session.user as any} />
        <div className={styles.appBody}>
          <Sidebar currentUser={session.user as any} />
          <main className={styles.mainContent}>
            {children}
          </main>
        </div>
        <GlobalSearchModal />
      </div>
    </UIProvider>
  );
}
