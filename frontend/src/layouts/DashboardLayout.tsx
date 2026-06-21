import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/shared/Sidebar';
import { Topbar } from '@/components/shared/Topbar';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#020818]">
      {/* Background grid texture */}
      <div className="pointer-events-none fixed inset-0 bg-grid-navy opacity-100" />
      {/* Radial gold glow at top */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-radial-gold" />

      <Sidebar />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
