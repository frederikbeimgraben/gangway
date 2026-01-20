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
            { url: "/favicon.svg", type: "image/svg+xml" },
            { url: "/favicon.png", type: "image/png" },
            { url: "/favicon.ico" },
        ],
    },
    manifest: "/manifest.json",
};

export const viewport = {
    themeColor: "#000000",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
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
