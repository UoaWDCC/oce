"use client";

//import { SessionProvider } from "next-auth/react";
import { UserProvider } from "../app/(with-navbar)/dao/userContext";

export default function SessionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    //<SessionProvider>
    <UserProvider>{children}</UserProvider>
    //</SessionProvider>
  );
}
