import { Outlet } from 'react-router-dom';

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-700 px-6 py-4 text-white shadow">
        <h1 className="text-xl font-bold">MUN Gridixia</h1>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
