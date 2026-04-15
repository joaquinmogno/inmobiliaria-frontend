import Header from "./Header";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import { useState } from "react";

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Header toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar mobileOpen={isMobileMenuOpen} closeMobile={() => setIsMobileMenuOpen(false)} />

        <main className="flex-1 bg-gray-100 overflow-y-auto p-4 sm:p-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
