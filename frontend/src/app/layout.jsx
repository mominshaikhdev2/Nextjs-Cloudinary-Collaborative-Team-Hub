import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata = {
  title: { default: "Collaborative Team Hub", template: "%s | Team Hub" },
  description: "Collaborative workspace for high-performing teams",
};

const themeScript = `
(function() {
  try {
    var stored = JSON.parse(localStorage.getItem('th-theme') || '{}').state;
    var theme = stored?.theme || 'dark';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme === 'system' && prefersDark);
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "var(--th-surface)",
              color: "var(--th-text-1)",
              border: "1px solid var(--th-border-2)",
              borderRadius: "10px",
              fontSize: "14px",
              fontFamily: "var(--font-dm-sans)",
            },
            success: { iconTheme: { primary: "#8b5cf6", secondary: "#fff" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
          }}
        />
      </body>
    </html>
  );
}
