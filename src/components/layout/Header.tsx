/**
 * Application header with title, view tabs, and theme toggle.
 */
import { Moon, Sun } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { Button } from '../ui/button';
import { VIEW_DEFINITIONS } from '@/views/registry';

export interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Header({ isDark, onToggleTheme }: HeaderProps) {
  const gitTagVersion = import.meta.env.VITE_GIT_TAG_VERSION;

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1800px] mx-auto px-6 py-2.5 flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-semibold tracking-tight">Simulator</h1>
            {gitTagVersion ? (
              <span className="text-xs font-medium text-muted-foreground tabular-nums">v{gitTagVersion}</span>
            ) : null}
          </div>
          <div className="h-4 w-px bg-border" />
          <nav className="flex items-center gap-1" aria-label="Views">
            {VIEW_DEFINITIONS.map((view) => (
              <NavLink
                key={view.id}
                to={view.path}
                end={view.path === '/'}
                className={({ isActive }) =>
                  `rounded-md px-2.5 py-1 text-sm transition-colors ${
                    isActive
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                {view.title}
              </NavLink>
            ))}
            <Link
              to="/docs"
              className="rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Documentation
            </Link>
          </nav>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Toggle theme" className="rounded-full">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
