/**
 * FormFeedback — Compact form quality indicator.
 * Small pill badge for overlaying on camera feed.
 */

'use client';

interface FormFeedbackProps {
    feedback: string;
    isDetecting: boolean;
}

export default function FormFeedback({
    feedback,
    isDetecting,
}: FormFeedbackProps) {
    if (!isDetecting) return null;

    const isGood = feedback === 'Good Form';

    return (
        <div
            className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide
                transition-all duration-500 animate-fade-in backdrop-blur-sm
                ${isGood
                    ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/25'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                }
            `}
        >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isGood ? (
                    <polyline points="20,6 9,17 4,12" />
                ) : (
                    <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>
                )}
            </svg>
            {feedback}
        </div>
    );
}
