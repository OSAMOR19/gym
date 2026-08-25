/**
 * CoachIntakeFlow — the scripted "Find my plan" conversation, embeddable.
 *
 * The same deterministic flow that used to live in CoachIntakeModal (one
 * question at a time, quick-reply chips, scoring over the real program
 * catalog), now rendered inside any container — today: the coach chat panel.
 * No LLM anywhere in here; the recommendation can only name programs that
 * exist, and limitations only filter.
 *
 * On plan selection it persists everywhere (localStorage + user profile +
 * INTAKE_COMPLETED event), announces 'irontrack-plan-saved' so open pages
 * refresh their banner, and hands the program id to the parent.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    INTAKE_STEPS, IntakeStep, IntakeAnswers, Recommendation,
    recommendProgram, saveCoachPlan, SAFETY_NOTE,
} from '../lib/coachIntake';
import { LEVEL_LABELS } from '../lib/programs';
import { saveIntakeProfile } from '../lib/userProfile';
import { logEvent } from '../lib/events';

interface Msg {
    from: 'coach' | 'user';
    text: string;
}

interface CoachIntakeFlowProps {
    /** Called after the user commits to a program (plan already saved). */
    onPlanChosen: (programId: string) => void;
}

export default function CoachIntakeFlow({ onPlanChosen }: CoachIntakeFlowProps) {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [stepIndex, setStepIndex] = useState(0);
    const [typing, setTyping] = useState(false);
    const [multiPicks, setMultiPicks] = useState<string[]>([]);
    const [rec, setRec] = useState<Recommendation | null>(null);
    const answersRef = useRef<Partial<IntakeAnswers>>({});
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const later = useCallback((fn: () => void, ms: number) => {
        timersRef.current.push(setTimeout(fn, ms));
    }, []);

    const coachSay = useCallback((text: string, delay = 700) => {
        setTyping(true);
        later(() => {
            setTyping(false);
            setMessages((prev) => [...prev, { from: 'coach', text }]);
        }, delay);
    }, [later]);

    const restart = useCallback(() => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
        answersRef.current = {};
        setMessages([]);
        setStepIndex(0);
        setMultiPicks([]);
        setRec(null);
        setTyping(false);
        coachSay("Five quick questions and I'll point you at the right plan.", 500);
        later(() => coachSay(INTAKE_STEPS[0].prompt, 700), 1300);
    }, [coachSay, later]);

    // Start fresh on mount; clear timers on unmount
    useEffect(() => {
        restart();
        const timers = timersRef.current;
        return () => timers.forEach(clearTimeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the newest message in view
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, typing, rec]);

    const finish = useCallback(() => {
        coachSay('Give me a second — matching you against every program…', 600);
        later(() => {
            const result = recommendProgram(answersRef.current as IntakeAnswers);
            setMessages((prev) => [...prev, { from: 'coach', text: "Here's what I'd start with:" }]);
            setRec(result);
        }, 1700);
    }, [coachSay, later]);

    const submitAnswer = useCallback((step: IntakeStep, values: string[], labels: string[]) => {
        setMessages((prev) => [...prev, { from: 'user', text: labels.join(', ') }]);

        const store = answersRef.current as Record<string, unknown>;
        if (step.id === 'daysPerWeek') store[step.id] = Number(values[0]);
        else if (step.multi) store[step.id] = values;
        else store[step.id] = values[0];

        setMultiPicks([]);
        if (stepIndex + 1 >= INTAKE_STEPS.length) {
            setStepIndex(INTAKE_STEPS.length);
            finish();
        } else {
            setStepIndex(stepIndex + 1);
            coachSay(INTAKE_STEPS[stepIndex + 1].prompt);
        }
    }, [stepIndex, coachSay, finish]);

    const choosePlan = useCallback((programId: string) => {
        const answers = answersRef.current as IntakeAnswers;
        const savedAt = new Date().toISOString();
        saveCoachPlan({ answers, programId, savedAt });
        // Fire-and-forget: a slow network must never delay the user's plan
        void saveIntakeProfile(answers, programId, savedAt);
        logEvent('INTAKE_COMPLETED', {
            metadata: {
                program_id: programId,
                goal: answers.goal,
                experience: answers.experience,
                equipment: answers.equipment,
                days_per_week: answers.daysPerWeek,
                limitations: answers.limitations,
            },
        });
        window.dispatchEvent(new CustomEvent('irontrack-plan-saved'));
        onPlanChosen(programId);
    }, [onPlanChosen]);

    const step = stepIndex < INTAKE_STEPS.length ? INTAKE_STEPS[stepIndex] : null;
    const showChips = step !== null && !typing && messages.some((m) => m.from === 'coach' && m.text === step.prompt);

    const toggleMulti = (s: IntakeStep, value: string) => {
        // "All good" is exclusive — picking it answers immediately
        if (value === 'none') {
            submitAnswer(s, ['none'], [s.options.find((o) => o.value === 'none')!.label]);
            return;
        }
        setMultiPicks((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev.filter((v) => v !== 'none'), value]
        );
    };

    const confirmMulti = (s: IntakeStep) => {
        if (multiPicks.length === 0) return;
        const labels = s.options.filter((o) => multiPicks.includes(o.value)).map((o) => o.label);
        submitAnswer(s, multiPicks, labels);
    };

    return (
        <>
            {/* Progress dots */}
            <div className="flex-none flex items-center justify-center gap-1 py-2 border-b border-white/5">
                {INTAKE_STEPS.map((s, i) => (
                    <span
                        key={s.id}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i < stepIndex ? 'bg-[#22c55e]' : i === stepIndex && !rec ? 'bg-white/40' : 'bg-white/10'}`}
                    />
                ))}
            </div>

            {/* Conversation */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`
                                max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed animate-fade-in
                                ${m.from === 'user'
                                    ? 'bg-[#22c55e]/15 text-[#a7f3c0] border border-[#22c55e]/20 rounded-br-md'
                                    : 'bg-white/[0.05] text-white/80 border border-white/5 rounded-bl-md'}
                            `}
                        >
                            {m.text}
                        </div>
                    </div>
                ))}

                {typing && (
                    <div className="flex justify-start">
                        <div className="bg-white/[0.05] border border-white/5 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1 items-center">
                            {[0, 1, 2].map((i) => (
                                <span
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse"
                                    style={{ animationDelay: `${i * 180}ms` }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendation card */}
                {rec && (
                    <div className="animate-fade-in pt-1 space-y-2.5">
                        <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${rec.program.color}35` }}>
                            <div className="relative h-32">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={rec.program.image} alt={rec.program.name} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                <div className="absolute bottom-2.5 left-3.5 right-3.5">
                                    <p className="text-[9px] font-bold tracking-widest uppercase mb-0.5" style={{ color: rec.program.color }}>
                                        {LEVEL_LABELS[rec.program.level]} · {rec.program.weeks.length}w · {rec.program.weeks[0]?.days.length ?? 3} days/week
                                    </p>
                                    <h3 className="text-lg font-bold text-white leading-tight">{rec.program.name}</h3>
                                </div>
                            </div>
                            <div className="p-3.5 space-y-1.5">
                                {rec.reasons.map((r, i) => (
                                    <div key={i} className="flex items-start gap-2 text-[11.5px] text-white/60">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={rec.program.color} strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                                            <polyline points="20,6 9,17 4,12" />
                                        </svg>
                                        {r}
                                    </div>
                                ))}
                                <button
                                    onClick={() => choosePlan(rec.program.id)}
                                    className="w-full mt-2 py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase transition-all cursor-pointer"
                                    style={{ backgroundColor: rec.program.color, color: '#000' }}
                                >
                                    Start this program
                                </button>
                            </div>
                        </div>

                        {rec.alternative && (
                            <button
                                onClick={() => choosePlan(rec.alternative!.id)}
                                className="w-full flex items-center justify-between rounded-xl border border-white/8 hover:border-white/20 px-3.5 py-2.5 transition-all cursor-pointer text-left"
                            >
                                <div>
                                    <p className="text-[10px] text-white/30">{rec.alternativeReason}</p>
                                    <p className="text-[13px] font-semibold text-white/75">{rec.alternative.name}</p>
                                </div>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/25">
                                    <polyline points="9,18 15,12 9,6" />
                                </svg>
                            </button>
                        )}

                        <p className="text-[9.5px] text-white/20 leading-relaxed px-1">{SAFETY_NOTE}</p>

                        <button
                            onClick={restart}
                            className="text-[11px] text-white/30 hover:text-white/60 transition-colors cursor-pointer px-1"
                        >
                            ↺ Retake the questions
                        </button>
                    </div>
                )}
            </div>

            {/* Quick-reply chips */}
            {showChips && step && (
                <div
                    className="flex-none border-t border-white/5 px-4 py-3.5"
                    style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
                >
                    <div className="flex flex-wrap gap-2 justify-end">
                        {step.options.map((opt) => {
                            const picked = multiPicks.includes(opt.value);
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() =>
                                        step.multi
                                            ? toggleMulti(step, opt.value)
                                            : submitAnswer(step, [opt.value], [opt.label])
                                    }
                                    title={opt.hint}
                                    className={`
                                        px-3.5 py-2 rounded-full text-[12px] font-medium border transition-all cursor-pointer
                                        ${picked
                                            ? 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/40'
                                            : 'text-white/60 border-white/10 hover:border-[#22c55e]/40 hover:text-white'}
                                    `}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                        {step.multi && multiPicks.length > 0 && (
                            <button
                                onClick={() => confirmMulti(step)}
                                className="px-3.5 py-2 rounded-full text-[12px] font-bold bg-[#22c55e] text-black transition-all cursor-pointer"
                            >
                                That&apos;s everything →
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
