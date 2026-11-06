import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import process from "node:process";

// The phone's camera (getUserMedia) only works on HTTPS, and an HTTPS page
// can't call an http:// server. So Vite serves the app over HTTPS with a
// self-signed certificate and proxies the API and Socket.IO to the Node server,
// keeping everything on one origin.
const target = process.env.TV_SERVER_URL || "http://localhost:8000";

const proxy = {
  "/api": { target, changeOrigin: true },
  "/socket.io": { target, changeOrigin: true, ws: true },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    allowedHosts: ["pi.local"],
    proxy,
  },
  preview: {
    host: true,
    allowedHosts: ["pi.local"],
    proxy,
  },
});
