/**
 * IronTrack AI — Main Page
 *
 * Single-page MVP that assembles all components:
 *   - Header with logo + exercise selector
 *   - Camera feed with skeleton overlay + rep counter
 *   - Form feedback badge
 *   - Stats panel (reps, tension, form quality)
 *   - Start/Stop control button
 */

'use client';

import { usePoseDetection } from '../hooks/usePoseDetection';
import Header from '../components/Header';
import CameraFeed from '../components/CameraFeed';
import RepCounterDisplay from '../components/RepCounter';
import StatsPanel from '../components/StatsPanel';
import FormFeedback from '../components/FormFeedback';

export default function Home() {
  const {
    videoRef,
    canvasRef,
    repCount,
    currentAngle,
    formQuality,
    feedback,
    timeUnderTension,
    isDetecting,
    exercise,
    landmarks,
    setExercise,
    startDetection,
    stopDetection,
  } = usePoseDetection();

  return (
    <main className="min-h-screen bg-[#0f0f0f] bg-grid relative">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#22c55e]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-[#38bdf8]/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6 min-h-screen">
        {/* ─── Top: Header ──────────────────────────────────────────────── */}
        <Header
          currentExercise={exercise}
          onSelectExercise={setExercise}
          isDetecting={isDetecting}
        />

        {/* ─── Center: Camera Feed + Rep Counter ────────────────────────── */}
        <div className="relative flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative w-full">
            <CameraFeed
              videoRef={videoRef}
              canvasRef={canvasRef}
              landmarks={landmarks}
              currentAngle={currentAngle}
              exercise={exercise}
              isDetecting={isDetecting}
            />

            {/* Rep counter overlay on camera feed */}
            <RepCounterDisplay count={repCount} isDetecting={isDetecting} />
          </div>

          {/* Form feedback + Start/Stop button row */}
          <div className="flex items-center justify-center gap-4 w-full">
            <FormFeedback feedback={feedback} isDetecting={isDetecting} />

            <button
              onClick={isDetecting ? stopDetection : startDetection}
              className={`
                px-8 py-3 rounded-xl font-semibold text-sm tracking-wide
                transition-all duration-300 cursor-pointer
                ${isDetecting
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                  : 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/40 hover:bg-[#22c55e]/25 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                }
              `}
            >
              {isDetecting ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  Stop Tracking
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Start Tracking
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ─── Bottom: Stats Panel ──────────────────────────────────────── */}
        <StatsPanel
          reps={repCount}
          timeUnderTension={timeUnderTension}
          formQuality={formQuality}
        />

        {/* Footer */}
        <footer className="text-center text-white/20 text-xs pb-2">
          <p>
            Powered by MediaPipe Pose · Built with Next.js
          </p>
        </footer>
      </div>
    </main>
  );
}
