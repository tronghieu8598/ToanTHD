'use client';

import { useMemo } from 'react';
import { layoutMathHtml } from '../lib/client/math-display.mjs';

export function Rich({ html, className = '' }: { html: string; className?: string }) {
    const formatted = useMemo(() => layoutMathHtml(html), [html]);
    return <div className={('rich ' + className).trim()} dangerouslySetInnerHTML={{ __html: formatted }} />;
}
