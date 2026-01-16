"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function ApiKeyWrapper({ children }) {
    const [isKeyProcessed, setIsKeyProcessed] = useState(false);
    const searchParams = useSearchParams();

    useEffect(() => {
        const apiKey = searchParams.get("apiKey");
        if (apiKey) {
            localStorage.setItem("apiKey", apiKey);
            // Clean the URL to remove the apiKey parameter
            const newUrl = `${window.location.pathname}${window.location.hash}`;
            window.history.replaceState({}, document.title, newUrl);
        }
        setIsKeyProcessed(true);
    }, [searchParams]);

    return <>{isKeyProcessed ? children : null}</>;
}
