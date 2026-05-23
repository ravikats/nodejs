import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Policy Reminder",
  description: "Track insurance policy premiums and expiry dates."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
