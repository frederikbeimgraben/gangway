"use client";

import React from "react";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-gray-900 border border-white/10 p-8 rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-300">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-500/10 rounded-full">
                        <WifiOff size={48} className="text-red-500" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                    You're Offline
                </h1>
                <p className="text-gray-400 mb-8">
                    It looks like you've lost your connection. The Gangway
                    interface requires a network connection to control the LEDs
                    and view live data.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-teal-900/20"
                >
                    Try Reconnecting
                </button>
                <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">
                        Gangway Controller System
                    </p>
                </div>
            </div>
            <p className="mt-8 text-gray-500 text-xs">
                Check your local network or Raspberry Pi status.
            </p>
        </div>
    );
}
