module.exports = [
"[project]/src/lib/gamification.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Gamification System — XP, Levels, Badges, Streaks
 *
 * XP formula: reps × (formScore / 50) × base multiplier
 * Levels: every 500 XP
 * Streaks: consecutive days with at least 1 workout
 * Badges: milestone achievements
 */ // ─── Types ───────────────────────────────────────────────────────────────────
__turbopack_context__.s([
    "BADGES",
    ()=>BADGES,
    "calculateXPForWorkout",
    ()=>calculateXPForWorkout,
    "getLevelFromXP",
    ()=>getLevelFromXP,
    "getXPForCurrentLevel",
    ()=>getXPForCurrentLevel,
    "loadStats",
    ()=>loadStats,
    "recordWorkout",
    ()=>recordWorkout,
    "saveStats",
    ()=>saveStats
]);
// ─── Constants ───────────────────────────────────────────────────────────────
const XP_PER_LEVEL = 500;
const STORAGE_KEY = 'irontrack_gamification';
const BADGES = [
    {
        id: 'first_workout',
        name: 'First Steps',
        description: 'Complete your first workout',
        icon: 'target',
        condition: (s)=>s.totalWorkouts >= 1
    },
    {
        id: 'ten_workouts',
        name: 'Dedicated',
        description: 'Complete 10 workouts',
        icon: 'trophy',
        condition: (s)=>s.totalWorkouts >= 10
    },
    {
        id: 'fifty_workouts',
        name: 'Iron Will',
        description: 'Complete 50 workouts',
        icon: 'medal',
        condition: (s)=>s.totalWorkouts >= 50
    },
    {
        id: 'hundred_reps',
        name: 'Century Club',
        description: 'Complete 100 total reps',
        icon: 'century',
        condition: (s)=>s.totalReps >= 100
    },
    {
        id: 'five_hundred_reps',
        name: 'Rep Machine',
        description: 'Complete 500 total reps',
        icon: 'gear',
        condition: (s)=>s.totalReps >= 500
    },
    {
        id: 'thousand_reps',
        name: 'Iron Legend',
        description: 'Complete 1,000 total reps',
        icon: 'crown',
        condition: (s)=>s.totalReps >= 1000
    },
    {
        id: 'perfect_form',
        name: 'Perfect Form',
        description: 'Complete 10 reps with 90%+ form score',
        icon: 'star',
        condition: (s)=>s.perfectFormReps >= 10
    },
    {
        id: 'three_day_streak',
        name: 'On a Roll',
        description: 'Maintain a 3-day workout streak',
        icon: 'flame',
        condition: (s)=>s.currentStreak >= 3
    },
    {
        id: 'seven_day_streak',
        name: 'Week Warrior',
        description: 'Maintain a 7-day workout streak',
        icon: 'bolt',
        condition: (s)=>s.longestStreak >= 7
    },
    {
        id: 'level_five',
        name: 'Rising Star',
        description: 'Reach level 5',
        icon: 'pentagon',
        condition: (s)=>s.level >= 5
    },
    {
        id: 'level_ten',
        name: 'Elite',
        description: 'Reach level 10',
        icon: 'diamond',
        condition: (s)=>s.level >= 10
    }
];
// ─── Default stats ───────────────────────────────────────────────────────────
function defaultStats() {
    return {
        totalXP: 0,
        level: 1,
        totalWorkouts: 0,
        totalReps: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        earnedBadges: [],
        perfectFormReps: 0
    };
}
function loadStats() {
    if ("TURBOPACK compile-time truthy", 1) return defaultStats();
    //TURBOPACK unreachable
    ;
}
function saveStats(stats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}
function calculateXPForWorkout(reps, formQuality) {
    const formMultiplier = Math.max(0.5, formQuality / 50); // 0.5× at 0%, 2× at 100%
    return Math.round(reps * formMultiplier * 10); // Base 10 XP per rep
}
function getLevelFromXP(xp) {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
}
function getXPForCurrentLevel(xp) {
    const currentLevelXP = xp % XP_PER_LEVEL;
    return {
        current: currentLevelXP,
        required: XP_PER_LEVEL
    };
}
// ─── Streak calculation ──────────────────────────────────────────────────────
function isConsecutiveDay(dateStr) {
    const last = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    return diffHours < 48; // Within 48 hours counts as consecutive
}
function isToday(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    return date.toDateString() === now.toDateString();
}
function recordWorkout(reps, formQuality, perfectReps) {
    const stats = loadStats();
    const xpGained = calculateXPForWorkout(reps, formQuality);
    // Update stats
    stats.totalReps += reps;
    stats.totalWorkouts += 1;
    stats.totalXP += xpGained;
    stats.level = getLevelFromXP(stats.totalXP);
    stats.perfectFormReps += perfectReps;
    // Update streak
    const today = new Date().toISOString();
    if (!stats.lastWorkoutDate || !isToday(stats.lastWorkoutDate)) {
        if (stats.lastWorkoutDate && isConsecutiveDay(stats.lastWorkoutDate)) {
            stats.currentStreak += 1;
        } else if (!stats.lastWorkoutDate || !isConsecutiveDay(stats.lastWorkoutDate)) {
            stats.currentStreak = 1;
        }
        stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    }
    stats.lastWorkoutDate = today;
    // Check for new badges
    const newBadges = [];
    for (const badge of BADGES){
        if (!stats.earnedBadges.includes(badge.id) && badge.condition(stats)) {
            stats.earnedBadges.push(badge.id);
            newBadges.push(badge);
        }
    }
    saveStats(stats);
    return {
        stats,
        newBadges,
        xpGained
    };
}
}),
"[project]/src/lib/progressStore.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Progress Store — Workout history and stats tracking with localStorage
 *
 * Saves each completed workout as a record and provides
 * aggregation functions for the progress dashboard.
 */ __turbopack_context__.s([
    "getAllWorkouts",
    ()=>getAllWorkouts,
    "getProgressStats",
    ()=>getProgressStats,
    "saveWorkout",
    ()=>saveWorkout
]);
// ─── Storage ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'irontrack_progress';
function getRecords() {
    if ("TURBOPACK compile-time truthy", 1) return [];
    //TURBOPACK unreachable
    ;
}
function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function saveWorkout(record) {
    const records = getRecords();
    const newRecord = {
        ...record,
        id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
        date: new Date().toISOString()
    };
    records.push(newRecord);
    saveRecords(records);
    return newRecord;
}
function getProgressStats() {
    const records = getRecords();
    const totalReps = records.reduce((sum, r)=>sum + r.reps, 0);
    const totalWorkouts = records.length;
    const totalDuration = records.reduce((sum, r)=>sum + r.duration, 0);
    const avgForm = records.length > 0 ? Math.round(records.reduce((sum, r)=>sum + r.formQuality, 0) / records.length) : 0;
    const bestForm = records.length > 0 ? Math.max(...records.map((r)=>r.formQuality)) : 0;
    // Weekly activity for the last 7 days
    const days = [
        'Sun',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat'
    ];
    const now = new Date();
    const weeklyActivity = [];
    for(let i = 6; i >= 0; i--){
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        const dateStr = date.toDateString();
        const dayRecords = records.filter((r)=>new Date(r.date).toDateString() === dateStr);
        weeklyActivity.push({
            day: dayName,
            reps: dayRecords.reduce((sum, r)=>sum + r.reps, 0),
            workouts: dayRecords.length
        });
    }
    // Recent workouts (last 10)
    const recentWorkouts = records.slice(-10).reverse();
    return {
        totalReps,
        totalWorkouts,
        totalDuration,
        averageFormQuality: avgForm,
        bestFormQuality: bestForm,
        weeklyActivity,
        recentWorkouts
    };
}
function getAllWorkouts() {
    return getRecords().reverse();
}
}),
"[project]/src/app/(app)/dashboard/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DashboardPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gamification$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/gamification.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$progressStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/progressStore.ts [app-ssr] (ecmascript)");
/**
 * Dashboard — COCKPIT layout.
 * One dominant element (weekly completion ring) center stage.
 * Asymmetric column splits. No stat grid at top.
 */ 'use client';
;
;
;
;
;
;
function DashboardPage() {
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const [gameStats, setGameStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [progressStats, setProgressStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setGameStats((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gamification$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadStats"])());
        setProgressStats((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$progressStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getProgressStats"])());
    }, []);
    const greeting = ()=>{
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };
    const weeklyTarget = 5; // target workouts per week
    const weeklyDone = progressStats?.weeklyActivity.filter((d)=>d.reps > 0).length || 0;
    const weeklyPct = Math.min(weeklyDone / weeklyTarget * 100, 100);
    const ringRadius = 80;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference - weeklyPct / 100 * ringCircumference;
    const xpCurrent = gameStats ? gameStats.totalXP % 500 : 0;
    const xpRequired = 500;
    const xpPct = xpCurrent / xpRequired * 100;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "max-w-5xl mx-auto p-4 md:p-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-end justify-between mb-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-white/20 tracking-widest uppercase mb-1",
                                children: new Date().toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric'
                                })
                            }, void 0, false, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 48,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-2xl font-bold text-white",
                                children: [
                                    greeting(),
                                    ", ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[#22c55e]",
                                        children: user?.name?.split(' ')[0]
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 52,
                                        columnNumber: 39
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 51,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                        lineNumber: 47,
                        columnNumber: 17
                    }, this),
                    gameStats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-8 h-8 rounded-lg bg-gradient-to-br from-[#22c55e] to-[#38bdf8] flex items-center justify-center",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-black text-xs font-black",
                                    style: {
                                        fontFamily: 'Orbitron, monospace'
                                    },
                                    children: gameStats.level
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                    lineNumber: 58,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 57,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-white/25 tracking-wider uppercase",
                                        children: "Level"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 63,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-20 h-1.5 bg-white/5 rounded-full overflow-hidden",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#38bdf8]",
                                            style: {
                                                width: `${xpPct}%`
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                            lineNumber: 65,
                                            columnNumber: 33
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 64,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 62,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                        lineNumber: 56,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                lineNumber: 46,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 mb-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative border border-white/5 rounded-xl p-8 flex flex-col items-center justify-center min-h-[320px]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-[200px] font-black text-white/[0.015] leading-none",
                                    style: {
                                        fontFamily: 'Orbitron, monospace'
                                    },
                                    children: weeklyDone
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                    lineNumber: 81,
                                    columnNumber: 25
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 80,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: 200,
                                        height: 200,
                                        className: "transform -rotate-90",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                                cx: 100,
                                                cy: 100,
                                                r: ringRadius,
                                                fill: "none",
                                                stroke: "rgba(255,255,255,0.03)",
                                                strokeWidth: 6
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 92,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                                cx: 100,
                                                cy: 100,
                                                r: ringRadius,
                                                fill: "none",
                                                stroke: "#22c55e",
                                                strokeWidth: 6,
                                                strokeLinecap: "round",
                                                strokeDasharray: ringCircumference,
                                                strokeDashoffset: ringOffset,
                                                style: {
                                                    transition: 'stroke-dashoffset 1s ease',
                                                    filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.3))'
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 93,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 91,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "absolute inset-0 flex flex-col items-center justify-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-4xl font-black text-white",
                                                style: {
                                                    fontFamily: 'Orbitron, monospace'
                                                },
                                                children: [
                                                    weeklyDone,
                                                    "/",
                                                    weeklyTarget
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 100,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] text-white/25 tracking-widest uppercase mt-1",
                                                children: "Workouts this week"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 103,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 99,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 90,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3 mt-6",
                                children: (progressStats?.weeklyActivity || []).map((d, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col items-center gap-1.5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: `w-2.5 h-2.5 rounded-full transition-all ${d.reps > 0 ? 'bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'bg-white/5'}`
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 113,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[9px] text-white/15",
                                                children: d.day
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 119,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, i, true, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 112,
                                        columnNumber: 29
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 110,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                        lineNumber: 78,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border border-white/5 rounded-xl p-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] text-white/20 tracking-widest uppercase",
                                                children: "Streak"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 130,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                width: "14",
                                                height: "14",
                                                viewBox: "0 0 24 24",
                                                fill: "none",
                                                stroke: "#f59e0b",
                                                strokeWidth: "1.5",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    d: "M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                    lineNumber: 131,
                                                    columnNumber: 124
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 131,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 129,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-3xl font-black text-[#f59e0b] mt-1",
                                        style: {
                                            fontFamily: 'Orbitron, monospace'
                                        },
                                        children: gameStats?.currentStreak || 0
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 133,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-white/15 mt-0.5",
                                        children: "consecutive days"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 136,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 128,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border border-white/5 rounded-xl p-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] text-white/20 tracking-widest uppercase",
                                        children: "Total Reps"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 141,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-3xl font-black text-[#22c55e] mt-1",
                                        style: {
                                            fontFamily: 'Orbitron, monospace'
                                        },
                                        children: progressStats?.totalReps || 0
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 142,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 140,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border border-white/5 rounded-xl p-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] text-white/20 tracking-widest uppercase",
                                        children: "Avg Form Score"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 149,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-3xl font-black text-[#a855f7] mt-1",
                                        style: {
                                            fontFamily: 'Orbitron, monospace'
                                        },
                                        children: [
                                            progressStats?.averageFormQuality || 0,
                                            "%"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 150,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 148,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/workout",
                                className: "flex items-center justify-center gap-2 py-3 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#22c55e] font-bold text-sm hover:bg-[#22c55e]/20 transition-all",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "16",
                                        height: "16",
                                        viewBox: "0 0 24 24",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "2",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                                            points: "5,3 19,12 5,21"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                            lineNumber: 160,
                                            columnNumber: 123
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 160,
                                        columnNumber: 25
                                    }, this),
                                    "Start Workout"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 156,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/programs",
                                className: "flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 text-white/40 font-medium text-sm hover:bg-white/[0.02] hover:text-white/60 transition-all",
                                children: [
                                    "Browse Programs",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "12",
                                        height: "12",
                                        viewBox: "0 0 24 24",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "1.5",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                                            points: "9,18 15,12 9,6"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                            lineNumber: 168,
                                            columnNumber: 125
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 168,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 163,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                        lineNumber: 126,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                lineNumber: 76,
                columnNumber: 13
            }, this),
            progressStats && progressStats.recentWorkouts.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-t border-white/5 pt-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-[10px] text-white/20 tracking-widest uppercase mb-3",
                        children: "Recent"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                        lineNumber: 176,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-3 overflow-x-auto pb-2",
                        children: progressStats.recentWorkouts.slice(0, 6).map((w)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-shrink-0 border border-white/5 rounded-lg px-4 py-3 min-w-[160px]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs font-medium text-white/70 truncate",
                                        children: w.exerciseName
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 180,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-baseline gap-2 mt-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-lg font-black text-[#22c55e]",
                                                style: {
                                                    fontFamily: 'Orbitron, monospace'
                                                },
                                                children: w.reps
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 182,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] text-white/20",
                                                children: "reps"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 185,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 181,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2 mt-1 text-[10px] text-white/15",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    "Form ",
                                                    w.formQuality,
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 188,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "w-0.5 h-0.5 bg-white/10 rounded-full"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 189,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: new Date(w.date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                                lineNumber: 190,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                        lineNumber: 187,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, w.id, true, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 179,
                                columnNumber: 29
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                        lineNumber: 177,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                lineNumber: 175,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
        lineNumber: 44,
        columnNumber: 9
    }, this);
}
}),
];

//# sourceMappingURL=src_7fb52df8._.js.map