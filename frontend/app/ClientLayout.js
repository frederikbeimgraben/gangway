"use client";

import { Suspense } from "react";
import { ApiKeyWrapper } from "./ApiKeyWrapper";

export default function ClientLayout({ children, onApiKeySet }) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ApiKeyWrapper onApiKeySet={onApiKeySet}>{children}</ApiKeyWrapper>
        </Suspense>
    );
}
