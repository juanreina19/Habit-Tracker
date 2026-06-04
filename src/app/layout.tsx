import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWARegistration } from "@/shared/components/PWARegistration";
import { ThemeProvider } from "@/shared/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Habit Tracker",
  description: "Seguimiento personal de hábitos con rachas y logros",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Habits",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Prevent flash of wrong theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}` }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <PWARegistration />
      </body>
    </html>
  );
}
