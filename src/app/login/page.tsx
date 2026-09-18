import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/server";

// Invite links look like /login?invite=FHS-XXXX-XXXX. When present, the form
// opens in signup mode with the code already filled in.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  const { invite } = await searchParams;
  const initialInvite = Array.isArray(invite) ? invite[0] : invite;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <AuthForm initialInvite={initialInvite ?? ""} />
    </main>
  );
}
