import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  let session = null;
  try {
    session = await auth();
  } catch (err) {
    console.error("[HomePage] Auth session error:", err);
  }

  if (session?.user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
