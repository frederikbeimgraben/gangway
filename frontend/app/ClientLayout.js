'use client';

import { Suspense } from 'react';
import { ApiKeyWrapper } from './ApiKeyWrapper';

export default function ClientLayout({ children }) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ApiKeyWrapper>{children}</ApiKeyWrapper>
        </Suspense>
    );
}
