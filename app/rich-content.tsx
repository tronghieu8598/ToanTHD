'use client';

import { useMemo } from 'react';
import { layoutMathHtml } from '../lib/client/math-display.mjs';

export function Rich({ html, className = '' }: { html: string; className?: string }) {
    // Keep the rendered MathML and images attached during unrelated state updates.
    const content = useMemo(() => ({ __html: layoutMathHtml(html) }), [html]);
    return <div className={('rich ' + className).trim()} dangerouslySetInnerHTML={content} />;
}
