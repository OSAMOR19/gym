/**
 * ExerciseGuide — Animated form illustration for the camera feed.
 * CSS-animated stick-figure SVGs that loop the exercise movement.
 * Positioned top-right on the camera view.
 */

'use client';

import { ExerciseId } from '../lib/exercises';

interface ExerciseGuideProps {
    exerciseId: ExerciseId;
    isDetecting: boolean;
}

// Each exercise has an animated SVG and a short tip
const EXERCISE_ILLUSTRATIONS: Record<ExerciseId, { svg: React.ReactNode; tip: string }> = {
    bicep_curl: {
        tip: 'Pin elbows to sides',
        svg: (
            <svg viewBox="0 0 80 100" fill="none" className="w-full h-full">
                <circle cx="40" cy="12" r="8" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="20" x2="40" y2="55" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="55" x2="28" y2="85" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="55" x2="52" y2="85" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="28" x2="25" y2="38" stroke="#22c55e" strokeWidth="2" />
                <line x1="25" y1="38" x2="25" y2="55" stroke="#22c55e" strokeWidth="2" />
                {/* Animated right arm — curling */}
                <g className="anim-curl-arm" style={{ transformOrigin: '55px 38px' }}>
                    <line x1="40" y1="28" x2="55" y2="38" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="55" y1="38" x2="55" y2="22" stroke="#38bdf8" strokeWidth="2.5" />
                    <rect x="50" y="18" width="10" height="5" rx="1" fill="#38bdf8" opacity="0.6" />
                </g>
                <circle cx="55" cy="38" r="3" fill="#38bdf8" opacity="0.3" />
            </svg>
        ),
    },
    hammer_curl: {
        tip: 'Neutral grip, elbows steady',
        svg: (
            <svg viewBox="0 0 80 100" fill="none" className="w-full h-full">
                <circle cx="40" cy="12" r="8" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="20" x2="40" y2="55" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="55" x2="28" y2="85" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="55" x2="52" y2="85" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="28" x2="25" y2="38" stroke="#22c55e" strokeWidth="2" />
                <line x1="25" y1="38" x2="25" y2="55" stroke="#22c55e" strokeWidth="2" />
                <g className="anim-curl-arm" style={{ transformOrigin: '55px 38px' }}>
                    <line x1="40" y1="28" x2="55" y2="38" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="55" y1="38" x2="55" y2="22" stroke="#38bdf8" strokeWidth="2.5" />
                    <rect x="53" y="16" width="4" height="10" rx="1" fill="#38bdf8" opacity="0.6" />
                </g>
            </svg>
        ),
    },
    pushup: {
        tip: 'Straight back, tuck elbows',
        svg: (
            <svg viewBox="0 0 100 60" fill="none" className="w-full h-full">
                <g className="anim-pushup-body">
                    <circle cx="18" cy="15" r="6" stroke="#22c55e" strokeWidth="2" />
                    <line x1="24" y1="19" x2="70" y2="22" stroke="#22c55e" strokeWidth="2" />
                    <line x1="70" y1="22" x2="88" y2="24" stroke="#22c55e" strokeWidth="2" />
                    <circle cx="88" cy="24" r="2" fill="#22c55e" opacity="0.5" />
                </g>
                {/* Arms — bending */}
                <g className="anim-pushup-arms">
                    <line x1="28" y1="20" x2="22" y2="32" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="22" y1="32" x2="22" y2="45" stroke="#38bdf8" strokeWidth="2.5" />
                </g>
                <line x1="10" y1="48" x2="95" y2="48" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 3" />
            </svg>
        ),
    },
    shoulder_press: {
        tip: 'Core tight, press overhead',
        svg: (
            <svg viewBox="0 0 80 100" fill="none" className="w-full h-full">
                <circle cx="40" cy="12" r="8" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="20" x2="40" y2="55" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="55" x2="28" y2="85" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="55" x2="52" y2="85" stroke="#22c55e" strokeWidth="2" />
                {/* Arms pressing up and down */}
                <g className="anim-press-arms">
                    <line x1="40" y1="28" x2="22" y2="32" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="22" y1="32" x2="18" y2="10" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="40" y1="28" x2="58" y2="32" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="58" y1="32" x2="62" y2="10" stroke="#38bdf8" strokeWidth="2.5" />
                    <rect x="12" y="6" width="12" height="5" rx="1" fill="#38bdf8" opacity="0.6" />
                    <rect x="56" y="6" width="12" height="5" rx="1" fill="#38bdf8" opacity="0.6" />
                </g>
            </svg>
        ),
    },
    lateral_raise: {
        tip: 'Arms to shoulder height',
        svg: (
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                <circle cx="50" cy="12" r="8" stroke="#22c55e" strokeWidth="2" />
                <line x1="50" y1="20" x2="50" y2="55" stroke="#22c55e" strokeWidth="2" />
                <line x1="50" y1="55" x2="38" y2="85" stroke="#22c55e" strokeWidth="2" />
                <line x1="50" y1="55" x2="62" y2="85" stroke="#22c55e" strokeWidth="2" />
                {/* Arms raising */}
                <g className="anim-lateral-arms">
                    <line x1="50" y1="28" x2="15" y2="30" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="50" y1="28" x2="85" y2="30" stroke="#38bdf8" strokeWidth="2.5" />
                    <circle cx="15" cy="30" r="3" fill="#38bdf8" opacity="0.5" />
                    <circle cx="85" cy="30" r="3" fill="#38bdf8" opacity="0.5" />
                </g>
                <line x1="10" y1="30" x2="90" y2="30" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.2" />
            </svg>
        ),
    },
    tricep_extension: {
        tip: 'Upper arm still, extend fully',
        svg: (
            <svg viewBox="0 0 80 100" fill="none" className="w-full h-full">
                <circle cx="40" cy="12" r="8" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="20" x2="40" y2="55" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="55" x2="28" y2="85" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="55" x2="52" y2="85" stroke="#22c55e" strokeWidth="2" />
                <line x1="40" y1="28" x2="25" y2="38" stroke="#22c55e" strokeWidth="2" />
                <line x1="25" y1="38" x2="25" y2="52" stroke="#22c55e" strokeWidth="2" />
                <g className="anim-tricep-arm" style={{ transformOrigin: '48px 12px' }}>
                    <line x1="40" y1="28" x2="48" y2="12" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="48" y1="12" x2="42" y2="28" stroke="#38bdf8" strokeWidth="2.5" />
                    <rect x="38" y="25" width="8" height="4" rx="1" fill="#38bdf8" opacity="0.6" />
                </g>
            </svg>
        ),
    },
    squat: {
        tip: 'Knees over toes, chest up',
        svg: (
            <svg viewBox="0 0 80 100" fill="none" className="w-full h-full">
                <g className="anim-squat-body">
                    <circle cx="40" cy="12" r="8" stroke="#22c55e" strokeWidth="2" />
                    <line x1="40" y1="20" x2="38" y2="48" stroke="#22c55e" strokeWidth="2" />
                    <line x1="38" y1="28" x2="20" y2="32" stroke="#22c55e" strokeWidth="2" />
                    <line x1="38" y1="28" x2="56" y2="32" stroke="#22c55e" strokeWidth="2" />
                </g>
                {/* Legs bending */}
                <g className="anim-squat-legs">
                    <line x1="38" y1="48" x2="24" y2="62" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="24" y1="62" x2="26" y2="85" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="38" y1="48" x2="52" y2="62" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="52" y1="62" x2="50" y2="85" stroke="#38bdf8" strokeWidth="2.5" />
                    <circle cx="24" cy="62" r="2.5" fill="#38bdf8" opacity="0.3" />
                    <circle cx="52" cy="62" r="2.5" fill="#38bdf8" opacity="0.3" />
                </g>
                <line x1="15" y1="62" x2="65" y2="62" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.2" />
            </svg>
        ),
    },
    lunge: {
        tip: 'Front knee behind toes',
        svg: (
            <svg viewBox="0 0 80 100" fill="none" className="w-full h-full">
                <g className="anim-squat-body">
                    <circle cx="35" cy="12" r="8" stroke="#22c55e" strokeWidth="2" />
                    <line x1="35" y1="20" x2="35" y2="48" stroke="#22c55e" strokeWidth="2" />
                    <line x1="35" y1="28" x2="22" y2="45" stroke="#22c55e" strokeWidth="2" />
                    <line x1="35" y1="28" x2="48" y2="45" stroke="#22c55e" strokeWidth="2" />
                </g>
                <g className="anim-squat-legs">
                    <line x1="35" y1="48" x2="22" y2="62" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="22" y1="62" x2="20" y2="85" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="35" y1="48" x2="55" y2="62" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="55" y1="62" x2="62" y2="82" stroke="#38bdf8" strokeWidth="2.5" />
                    <circle cx="22" cy="62" r="2.5" fill="#38bdf8" opacity="0.3" />
                </g>
            </svg>
        ),
    },
    jump_squat: {
        tip: 'Explode up, land softly',
        svg: (
            <svg viewBox="0 0 80 100" fill="none" className="w-full h-full">
                <g className="anim-jump-body">
                    <circle cx="40" cy="8" r="8" stroke="#22c55e" strokeWidth="2" />
                    <line x1="40" y1="16" x2="40" y2="42" stroke="#22c55e" strokeWidth="2" />
                    <line x1="40" y1="22" x2="22" y2="10" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="40" y1="22" x2="58" y2="10" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="40" y1="42" x2="28" y2="55" stroke="#22c55e" strokeWidth="2" />
                    <line x1="28" y1="55" x2="30" y2="72" stroke="#22c55e" strokeWidth="2" />
                    <line x1="40" y1="42" x2="52" y2="55" stroke="#22c55e" strokeWidth="2" />
                    <line x1="52" y1="55" x2="50" y2="72" stroke="#22c55e" strokeWidth="2" />
                </g>
                <line x1="15" y1="85" x2="65" y2="85" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 3" />
            </svg>
        ),
    },
    calf_raise: {
        tip: 'Rise onto toes, hold peak',
        svg: (
            <svg viewBox="0 0 80 100" fill="none" className="w-full h-full">
                <g className="anim-calf-body">
                    <circle cx="40" cy="12" r="8" stroke="#22c55e" strokeWidth="2" />
                    <line x1="40" y1="20" x2="40" y2="55" stroke="#22c55e" strokeWidth="2" />
                    <line x1="40" y1="28" x2="28" y2="42" stroke="#22c55e" strokeWidth="2" />
                    <line x1="40" y1="28" x2="52" y2="42" stroke="#22c55e" strokeWidth="2" />
                    <line x1="40" y1="55" x2="36" y2="78" stroke="#22c55e" strokeWidth="2" />
                    <line x1="40" y1="55" x2="44" y2="78" stroke="#22c55e" strokeWidth="2" />
                    <line x1="36" y1="78" x2="34" y2="82" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="44" y1="78" x2="46" y2="82" stroke="#38bdf8" strokeWidth="2.5" />
                </g>
            </svg>
        ),
    },
    plank: {
        tip: 'Straight line, head to heels',
        svg: (
            <svg viewBox="0 0 100 60" fill="none" className="w-full h-full">
                <g className="anim-plank-breathe">
                    <circle cx="15" cy="18" r="6" stroke="#22c55e" strokeWidth="2" />
                    <line x1="21" y1="22" x2="75" y2="24" stroke="#22c55e" strokeWidth="2" />
                    <line x1="25" y1="22" x2="20" y2="30" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="20" y1="30" x2="25" y2="42" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="75" y1="24" x2="90" y2="26" stroke="#22c55e" strokeWidth="2" />
                    <circle cx="90" cy="26" r="2" fill="#22c55e" opacity="0.5" />
                </g>
                <line x1="12" y1="18" x2="92" y2="24" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3" />
                <line x1="10" y1="45" x2="95" y2="45" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 3" />
            </svg>
        ),
    },
    situp: {
        tip: 'Curl up with core, not neck',
        svg: (
            <svg viewBox="0 0 100 60" fill="none" className="w-full h-full">
                <g className="anim-situp-body">
                    <circle cx="35" cy="12" r="6" stroke="#22c55e" strokeWidth="2" />
                    <line x1="38" y1="17" x2="52" y2="32" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="52" y1="32" x2="75" y2="38" stroke="#22c55e" strokeWidth="2" />
                    <line x1="75" y1="38" x2="82" y2="25" stroke="#22c55e" strokeWidth="2" />
                    <line x1="82" y1="25" x2="88" y2="38" stroke="#22c55e" strokeWidth="2" />
                    <line x1="36" y1="15" x2="42" y2="8" stroke="#22c55e" strokeWidth="1.5" />
                </g>
                <circle cx="52" cy="32" r="4" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" className="anim-plank-breathe" />
                <line x1="10" y1="42" x2="95" y2="42" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 3" />
            </svg>
        ),
    },
    mountain_climber: {
        tip: 'Hips level, drive knees',
        svg: (
            <svg viewBox="0 0 100 60" fill="none" className="w-full h-full">
                <circle cx="18" cy="14" r="6" stroke="#22c55e" strokeWidth="2" />
                <line x1="24" y1="18" x2="65" y2="22" stroke="#22c55e" strokeWidth="2" />
                <line x1="25" y1="18" x2="22" y2="40" stroke="#22c55e" strokeWidth="2" />
                {/* Animated legs — alternating knee drives */}
                <g className="anim-mc-left-leg">
                    <line x1="55" y1="22" x2="40" y2="32" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="40" y1="32" x2="42" y2="42" stroke="#38bdf8" strokeWidth="2.5" />
                </g>
                <g className="anim-mc-right-leg">
                    <line x1="65" y1="22" x2="85" y2="28" stroke="#22c55e" strokeWidth="2" />
                </g>
                <line x1="10" y1="45" x2="95" y2="45" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 3" />
            </svg>
        ),
    },
};

export default function ExerciseGuide({ exerciseId }: ExerciseGuideProps) {

    const illustration = EXERCISE_ILLUSTRATIONS[exerciseId];
    if (!illustration) return null;

    return (
        <div className="bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 p-2 w-24 animate-fade-in">
            <div className="w-20 h-20 mx-auto">
                {illustration.svg}
            </div>
            <p className="text-[8px] text-white/50 text-center mt-1 leading-tight font-medium">
                {illustration.tip}
            </p>
        </div>
    );
}
