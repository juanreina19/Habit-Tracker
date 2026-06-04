import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { PWARegistration } from "@/shared/components/PWARegistration";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import esMessages from "../../messages/es.json";
import enMessages from "../../messages/en.json";

const allMessages = { es: esMessages, en: enMessages };

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "es") as "es" | "en";
  const messages = allMessages[locale] ?? allMessages.es;

  return (
    <html lang={locale}>
      <head>
        {/* Prevent flash of wrong theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}` }} />
      </head>
      <body>
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
        <PWARegistration />
      </body>
    </html>
  );
}
