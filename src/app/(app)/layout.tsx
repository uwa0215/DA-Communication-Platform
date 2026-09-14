import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlobalSearchModal from "@/components/layout/GlobalSearchModal";
import { UIProvider } from "@/components/UIProvider";
import styles from "./app.module.css";

import { SessionProvider } from "next-auth/react";
import { CallProvider } from "@/components/CallProvider";
import { SWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let session = null;
  try {
    session = await auth();
  } catch (err) {
    console.error("[AppLayout] Auth session error:", err);
  }

  if (!session?.user) redirect("/login");

  return (
    <SessionProvider session={session}>
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: false,
          dedupingInterval: 10000,
          keepPreviousData: true,
        }}
      >
        <UIProvider>
          <CallProvider>
            <div className={styles.appShell}>
              <Topbar currentUser={session.user as any} />
              <div className={styles.appBody}>
                <Sidebar currentUser={session.user as any} />
                <main className={styles.mainContent}>
                  {children}
                </main>
              </div>
              <GlobalSearchModal />
            </div>
          </CallProvider>
        </UIProvider>
      </SWRConfig>
    </SessionProvider>
  );
}
