/**
 * Main application layout.
 */
import { Header } from './Header';
import { ThemeProvider, useTheme } from '@/contexts';

export interface AppLayoutProps {
  children: React.ReactNode;
}

function AppLayoutInner({ children }: AppLayoutProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header isDark={isDark} onToggleTheme={toggleTheme} />
      <main className="flex-1 container mx-auto px-4 py-4">
        {children}
      </main>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <ThemeProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </ThemeProvider>
  );
}
