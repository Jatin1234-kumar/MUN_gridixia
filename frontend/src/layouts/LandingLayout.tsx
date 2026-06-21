import { Outlet } from 'react-router-dom';

export default function LandingLayout() {
  return (
    <div className="min-h-screen bg-navy-950 overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 bg-grid-navy opacity-100" />
      <Outlet />
    </div>
  );
}
