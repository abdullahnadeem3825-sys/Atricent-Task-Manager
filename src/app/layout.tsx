import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { UserProvider } from "@/context/UserContext";
import ToastContainer from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Company OS — Internal Dashboard",
  description:
    "Internal company dashboard with task management and AI assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <UserProvider>
            {children}
            <ToastContainer />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
