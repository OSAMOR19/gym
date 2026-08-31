/**
 * Skeleton — shimmer placeholder for content that is still loading.
 *
 * Drop-in sized by className (`<Skeleton className="h-24 rounded-xl" />`).
 * Keeps loading pages structurally identical to their loaded state so
 * nothing jumps when data arrives.
 */

export default function Skeleton({ className = '' }: { className?: string }) {
    return (
        <div
            aria-hidden="true"
            className={`animate-pulse bg-ink/[0.04] border border-ink/5 ${className}`}
        />
    );
}
