"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import CourseFooter from "@/components/courseFooter";
import CourseNavbar from "@/components/navBarCourse";

export default function NavigationWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDao = pathname !== "/" && pathname !== "/contact-us";
  const isLogin = pathname === "/login";
  const isRegister = pathname === "/register";

  return (
    <div className="relative w-full min-h-screen bg-white text-gray-800">
      {(isLogin || isRegister) && (
        <div>
          <CourseNavbar />
        </div>
      )}

      {!isDao && (
        <div>
          <Navbar />
        </div>
      )}

      <main className="flex-1">{children}</main>

      {isDao ? <CourseFooter /> : <Footer />}
    </div>
  );
}
