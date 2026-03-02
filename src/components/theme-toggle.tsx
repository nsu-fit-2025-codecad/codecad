import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
  const label =
    resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative cursor-pointer"
      onClick={() => setTheme(nextTheme)}
      title={label}
      aria-label={label}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:-rotate-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:rotate-90" />
      <span className="sr-only">{label}</span>
    </Button>
  );
};
