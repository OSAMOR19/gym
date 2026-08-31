/**
 * BrandLogo — the designer mark (+ optional IRONTRACK wordmark).
 *
 * Renders BOTH theme variants of the mark; globals.css shows exactly one
 * based on the active [data-theme] (and pins the dark mark inside
 * .force-dark subtrees). Pure markup — no context, hydration-safe.
 */

const SIZES = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
} as const;

const TEXT_SIZES = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
} as const;

export default function BrandLogo({
    size = 'md',
    withWordmark = true,
    className = '',
}: {
    size?: keyof typeof SIZES;
    withWordmark?: boolean;
    className?: string;
}) {
    return (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/brand/logo-dark.png"
                alt="IronTrack"
                className={`brand-logo-dark ${SIZES[size]} w-auto select-none`}
                draggable={false}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/brand/logo-light.png"
                alt="IronTrack"
                className={`brand-logo-light ${SIZES[size]} w-auto select-none`}
                draggable={false}
            />
            {withWordmark && (
                <span className={`${TEXT_SIZES[size]} font-bold tracking-wider text-ink font-display`}>
                    IRON<span className="text-accent">TRACK</span>
                </span>
            )}
        </span>
    );
}
