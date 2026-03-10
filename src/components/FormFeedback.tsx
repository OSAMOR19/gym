/**
 * FormFeedback — Real-time form quality badge.
 *
 * Shows "Good Form ✓" in green or "Fix Your Form ⚠" in amber
 * based on the feedback from the rep counter logic.
 * Fades in/out with a smooth transition.
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
        inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
        transition-all duration-500 animate-fade-in
        ${isGood
                    ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                }
      `}
        >
            <span className="text-lg">{isGood ? '✓' : '⚠'}</span>
            {feedback}
        </div>
    );
}
