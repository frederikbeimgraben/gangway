"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ApiKeyWrapper({ children, onApiKeySet }) {
    const searchParams = useSearchParams();

    useEffect(() => {
        const apiKey = searchParams.get("apiKey");
        if (apiKey) {
            localStorage.setItem("apiKey", apiKey);
            if (onApiKeySet) {
                onApiKeySet(apiKey);
            }
            // Clean the URL to remove the apiKey parameter
            const newUrl = `${window.location.pathname}${window.location.hash}`;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [searchParams, onApiKeySet]);

    return <>{children}</>;
}
