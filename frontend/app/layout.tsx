import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { DevModeProvider } from '@/components/dev/DevModeProvider';
import { PrivacyProvider } from '@/components/privacy/PrivacyProvider';
import { PrivacyBanner } from '@/components/privacy/PrivacyBanner';
import { Toaster } from '@/components/ui/sonner';
import { generateThemeScript } from '@/lib/theme-config';

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
  // Generated from centralized theme config
  const themeScript = generateThemeScript();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background">
        <DevModeProvider>
          <PrivacyProvider>
            <div className="flex h-screen flex-col">
              {/* Privacy Banner - shows when values are hidden */}
              <PrivacyBanner />

              <div className="flex flex-1 overflow-hidden">
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
            </div>
            <Toaster />
          </PrivacyProvider>
        </DevModeProvider>
      </body>
    </html>
  );
}
