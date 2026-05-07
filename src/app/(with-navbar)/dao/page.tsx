export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DaoPageClient from "./DaoPageClient";

export default async function DAOPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Use UID instead of Email for lookup
  const { data: student, error: studentError } = await supabase
    .from("Student")
    .select("*")
    .eq("UID", user.id)
    .single();

  if (studentError || !student) {
    redirect("/register");
  }

  // Just render the client component - it will fetch its own data
  return <DaoPageClient />;
}
