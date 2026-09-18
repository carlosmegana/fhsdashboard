import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import { getCurrentUser } from "@/lib/auth";

// Shared shell for every signed-in page: top navigation + content column.
// The proxy already redirects signed-out visitors to /login; the check here is a
// second guard so the layout never renders without a user.
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <AppNav isAdmin={user.isAdmin} />
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </>
  );
}
