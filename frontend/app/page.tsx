import { redirect } from "next/navigation";

// Root redirect — Next.js middleware handles the actual auth check.
// Authenticated users land on /overview; unauthenticated land on /login.
export default function RootPage() {
  redirect("/overview");
}
