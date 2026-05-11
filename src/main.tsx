import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {GoogleOAuthProvider} from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

// Tame tamaro Google Client ID .env file ma nakhi sako cho
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

console.log("Google Client ID loaded:", GOOGLE_CLIENT_ID ? "Yes" : "No");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);
