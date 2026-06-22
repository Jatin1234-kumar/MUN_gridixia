import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/shared/Sidebar';
import { Topbar } from '@/components/shared/Topbar';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:p-4 focus:bg-gold-500 focus:text-navy-950 focus:font-medium"
      >
        Skip to content
      </a>
      {/* Background grid texture */}
      <div className="pointer-events-none fixed inset-0 bg-grid-navy opacity-100" />
      {/* Radial gold glow at top */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-radial-gold" />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6 max-md:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
