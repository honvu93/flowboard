import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">F</span>
            </span>
            <span className="font-semibold text-gray-900">FlowBoard</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            Home
          </Link>
          <Link href="/flow-studio" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-purple-700 bg-purple-50 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            Flow Studio
          </Link>
        </nav>
        <div className="p-3 border-t border-gray-200 text-xs text-gray-400">
          AI Video Creation
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
