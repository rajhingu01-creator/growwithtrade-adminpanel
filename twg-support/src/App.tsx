/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/admin/AdminDashboard';
import ChatWidget from './components/chat/ChatWidget';

function MainApp() {
  const { user, profile, loading, isAgent } = useAuth();
  const isWidgetMode = window.location.search.includes('widget=true');

  if (isWidgetMode) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-transparent">
        <ChatWidget isStandalone />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-t-blue-600 border-blue-600/20 rounded-full animate-spin" />
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Encrypting Space...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // If the user is an agent/admin, show the dashboard
  if (isAgent) {
    return <AdminDashboard />;
  }

  // Normal user view
  return <LandingPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
