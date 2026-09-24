import Header from "./Header";
import Sidebar from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import ReauthenticationDialog from "../components/ReauthenticationDialog";
import GlobalConfirmationDialog from "../components/GlobalConfirmationDialog";

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 1280px)").matches);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerWasOpen = useRef(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1280px)");
    const closeDrawerOnDesktop = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(event.matches);
      if (event.matches) setIsMobileMenuOpen(false);
    };

    closeDrawerOnDesktop(desktopQuery);
    desktopQuery.addEventListener("change", closeDrawerOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeDrawerOnDesktop);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen && !isDesktop) {
      drawerWasOpen.current = true;
      window.requestAnimationFrame(() => {
        sidebarRef.current?.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus();
      });
      return;
    }

    if (drawerWasOpen.current) {
      drawerWasOpen.current = false;
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, [isDesktop, isMobileMenuOpen]);

  useEffect(() => {
    window.requestAnimationFrame(() => mainRef.current?.focus());
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen || isDesktop) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isDesktop, isMobileMenuOpen]);

  const mobileBackgroundInert = isMobileMenuOpen && !isDesktop;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <a
        href="#main-content"
        onClick={() => window.requestAnimationFrame(() => mainRef.current?.focus())}
        className="fixed left-4 top-3 z-[300] -translate-y-24 rounded-lg bg-white px-4 py-3 font-bold text-indigo-800 shadow-xl transition-transform focus:translate-y-0"
      >
        Saltar al contenido principal
      </a>
      <Header
        toggleMobileMenu={() => setIsMobileMenuOpen(current => !current)}
        mobileMenuOpen={isMobileMenuOpen}
        menuButtonRef={menuButtonRef}
        inert={mobileBackgroundInert}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          ref={sidebarRef}
          mobileOpen={isMobileMenuOpen}
          isDesktop={isDesktop}
          closeMobile={() => setIsMobileMenuOpen(false)}
        />

        <main
          ref={mainRef}
          id="main-content"
          tabIndex={0}
          aria-label="Contenido principal"
          aria-hidden={mobileBackgroundInert || undefined}
          inert={mobileBackgroundInert || undefined}
          className="min-w-0 flex-1 bg-gray-100 overflow-y-auto overflow-x-hidden p-4 sm:p-6 w-full focus:outline-none"
        >
          <Outlet />
        </main>
        <ReauthenticationDialog />
        <GlobalConfirmationDialog />
      </div>
    </div>
  );
}
