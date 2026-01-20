import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    applicationName: "Gangway",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Gangway",
    },
    title: "GANGWAY Control",
    description: "LED Controller Interface",
    formatDetection: {
        telephone: false,
    },
    icons: {
        shortcut: "/favicon.ico",
        apple: "/icons/apple-touch-icon.png",
        icon: [
            { url: "/favicon.png" },
            { url: "/favicon.ico" },
            { url: "/favicon.svg" },
        ],
    },
    manifest: "/manifest.json",
};

export const viewport = {
    themeColor: "#000000",
    viewport:
        "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}
