import { redirect } from "next/navigation";
import LayoutWrapper from "./components/layoutWrapper";
import { createClient } from "@/utils/supabase/server";
import LearningButtonWrapper from "@/components/modules/LearningButtonWrapper";

export default async function WithNavbarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: student } = await supabase
    .from("Student")
    .select("Wallet")
    .eq("UID", user.id)
    .single();

  if (!student) {
    redirect("/register");
  }

  const walletData = Array.isArray(student?.Wallet)
    ? student.Wallet.map((w: { walletAddress: string; ENS: string }) => ({
        publicAddress: w.walletAddress,
        ENS: w.ENS,
      }))
    : [];

  return (
    <LayoutWrapper
      initialUser={{ email: user.email!, UID: user.id }}
      initialWallets={walletData}
    >
      {children}
      <LearningButtonWrapper />
    </LayoutWrapper>
  );
}

export const dynamic = "force-dynamic";
