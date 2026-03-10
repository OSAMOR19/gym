/**
 * Header — App branding and exercise selector.
 *
 * Displays the "IronTrack AI" logo with futuristic styling
 * and the exercise selector row beneath it.
 */

'use client';

import ExerciseSelector from './ExerciseSelector';
import { Exercise } from '../lib/repCounter';

interface HeaderProps {
    currentExercise: Exercise;
    onSelectExercise: (exercise: Exercise) => void;
    isDetecting: boolean;
}

export default function Header({
    currentExercise,
    onSelectExercise,
    isDetecting,
}: HeaderProps) {
    return (
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#38bdf8] flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                    <svg
                        className="w-6 h-6 text-black"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                </div>
                <div>
                    <h1
                        className="text-xl font-bold tracking-wider text-white"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        IRONTRACK
                        <span className="text-[#22c55e] ml-1">AI</span>
                    </h1>
                    <p className="text-[10px] text-white/30 tracking-[0.3em] uppercase font-medium -mt-0.5">
                        AI-Powered Workout Tracker
                    </p>
                </div>
            </div>

            {/* Exercise Selector */}
            <ExerciseSelector
                currentExercise={currentExercise}
                onSelect={onSelectExercise}
                isDetecting={isDetecting}
            />
        </header>
    );
}
