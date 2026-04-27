import React from 'react';
import { AppRoutes } from './routes/AppRoutes';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/sonner';
import './index.css';

export const App = () => (
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <div className="min-h-screen bg-background text-foreground">
      <AppRoutes />
      <Toaster richColors position="bottom-right" />
    </div>
  </ThemeProvider>
);
