import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { ThemeProvider } from 'next-themes';
import { ColorThemeProvider } from '@/components/theme/ColorThemeProvider';
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <ColorThemeProvider>
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
          </ColorThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
