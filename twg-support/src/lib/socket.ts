import { io } from 'socket.io-client';

declare global {
  interface Window {
    __TWG_SOCKET_URL__?: string;
  }
}

const URL = (
  window.__TWG_SOCKET_URL__ ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin)
).trim();

export const socket = io(URL, {
  autoConnect: false
});
