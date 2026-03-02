import React from 'react';
import { AppRoutes } from './routes/AppRoutes';
import { ThemeProvider } from './components/theme-provider';
import './index.css';

export const App = () => (
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <div className="min-h-screen bg-background text-foreground">
      <AppRoutes />
    </div>
  </ThemeProvider>
);
