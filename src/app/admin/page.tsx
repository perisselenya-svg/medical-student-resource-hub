import { redirect } from "next/navigation";

/** /admin → dashboard (the proxy has already required a valid admin session). */
export default function AdminIndex() {
  redirect("/admin/dashboard");
}
