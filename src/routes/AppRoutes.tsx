import React from 'react';
import { Route, Router } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { HomePage } from '@/pages/HomePage';

export const AppRoutes = () => (
  <Router hook={useHashLocation as any}>
    <Route path="/">
      <HomePage />
    </Route>
  </Router>
);
