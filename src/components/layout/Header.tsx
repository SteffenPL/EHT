/**
 * Application header with title and theme toggle.
 */
import { Moon, Sun } from 'lucide-react';
import { Button } from '../ui/button';

export interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Header({ isDark, onToggleTheme }: HeaderProps) {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">EHT Simulator</h1>
        <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Toggle theme">
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
