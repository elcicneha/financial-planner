import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { DevModeProvider } from '@/components/dev/DevModeProvider';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Financial Planner',
  description: 'Upload and process mutual fund PDF statements',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inline blocking script to prevent flash of unstyled content
  // This runs before React hydration and sets both data-theme and data-mode attributes
  const themeScript = `
    (function() {
      try {
        const validThemes = ['default', 'neo'];
        const validModes = ['light', 'dark'];

        const theme = localStorage.getItem('theme') || 'default';
        const mode = localStorage.getItem('mode') || 'light';

        if (validThemes.includes(theme)) {
          document.documentElement.setAttribute('data-theme', theme);
        } else {
          document.documentElement.setAttribute('data-theme', 'default');
        }

        if (validModes.includes(mode)) {
          document.documentElement.setAttribute('data-mode', mode);
        } else {
          document.documentElement.setAttribute('data-mode', 'light');
        }
      } catch (e) {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background">
        <DevModeProvider>
          <div className="flex h-screen">
            {/* Desktop Sidebar - hidden on mobile */}
            <aside className="hidden md:flex">
              <Sidebar />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden">
              {/* Mobile Header */}
              <header className="md:hidden flex items-center h-14 px-4 border-b border-border/50">
                <MobileSidebar />
                <span className="ml-3 font-display font-semibold text-sm">Financial Planner</span>
              </header>

              {/* Page Content */}
              <div className="flex-1 overflow-auto p-6 md:p-8">
                <div className="page-enter">
                  {children}
                </div>
              </div>
            </main>
          </div>
          <Toaster />
        </DevModeProvider>
      </body>
    </html>
  );
}
