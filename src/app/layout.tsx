import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/SessionProvider";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Bird Records",
  description: "Internal tool for processing bird ringing/recovery records",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Nav />
          <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
