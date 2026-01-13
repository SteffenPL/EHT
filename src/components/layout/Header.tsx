/**
 * Application header with title, model selector, and theme toggle.
 */
import { Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { ModelSelector } from './ModelSelector';

export interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Header({ isDark, onToggleTheme }: HeaderProps) {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Simulator</h1>
          <ModelSelector />
          <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground">
            Documentation
          </Link>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Toggle theme">
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
