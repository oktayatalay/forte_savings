import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forte Savings - Tasarruf Yönetim Sistemi",
  description: "Forte Savings ile tasarruflarınızı profesyonelce yönetin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* Prefetch DNS for API endpoints */}
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || ''} />
        {/* Prevent flash of unstyled content */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .loading-skeleton {
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: .5;
              }
            }
          `
        }} />
      </head>
      <body className="font-sans antialiased">
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            suppressHydrationWarning
          >
            {children}
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}