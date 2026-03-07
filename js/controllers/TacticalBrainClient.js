// ============================================================
// CRICKET LEGENDS - LLM Tactical Brain Client
// Dynamic, context-aware tactical intelligence engine.
// Non-blocking. Returns null on any failure.
// ============================================================

class TacticalBrainClient {
    constructor(config = {}) {
        const defaults = {
            enabled: false,
            endpoint: 'http://localhost:8787/api/tactical-plan',
            model: 'gpt-4o-mini',
            timeoutMs: 5000,
            planTTLBalls: 6,               // one full over per plan by default
            momentumWindow: 6,             // balls to track for momentum
            pressureScaleSensitivity: 1.2,
            enablePlanMemory: true,        // feed previous plan back for continuity
            maxPlanAge: 12,
            overHistoryDepth: 5,           // how many past overs to remember
        };
        this.config = { ...defaults, ...(config || {}) };
        this.loggedStatus = false;

        // Live state memory — persists across the whole match
        this._state = {
            batting: this._freshSideState(),
            bowling: this._freshSideState(),
        };
        this._lastSeenInnings = 1;
        this._inningsArchive = {};

        // Shared over-log: one entry per completed over
        // { over, runs, wickets, boundaries, dots, wides, noballs, outcomes[], planIntent, planWorked }
        this._overHistory = [];
        this._currentOverTracker = this._freshOverTracker(1);
    }

    _freshSideState() {
        return {
            lastPlan: null,
            lastPlanBall: -1,
            lastPlanOver: -1,
            recentOutcomes: [],
            consecutiveDots: 0,
            consecutiveBoundaries: 0,
            momentum: 'neutral',
            planGenCount: 0,
            planEffectiveness: null,   // 'worked' | 'backfired' | 'mixed' | null
        };
    }

    _freshOverTracker(overNum) {
        return {
            over: overNum,
            outcomes: [],
            runs: 0,
            wickets: 0,
            boundaries: 0,
            dots: 0,
            wides: 0,
            noballs: 0,
            battingPlanIntent: null,
            bowlingPlanIntent: null,
        };
    }

    // ─────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────

    isEnabled() {
        return !!(this.config.enabled && this.config.endpoint && this.config.model);
    }

    /**
     * Register a ball outcome so the brain can track momentum & over history.
     * Call this after every ball resolves, BEFORE requestPlan for the next ball.
     *
     * @param {'batting'|'bowling'} side
     * @param {'dot'|'single'|'two'|'three'|'four'|'six'|'wicket'|'wide'|'noball'} outcome
     * @param {number} runs  - actual runs scored this ball (including extras)
     */
    recordBallOutcome(side, outcome, runs = 0) {
        const s = this._state[side];
        if (!s) return;

        // Rolling recent outcomes
        const window = this.config.momentumWindow;
        s.recentOutcomes = [...s.recentOutcomes.slice(-(window - 1)), outcome];

        // Consecutive streak counters
        if (outcome === 'dot') {
            s.consecutiveDots++;
            s.consecutiveBoundaries = 0;
        } else if (outcome === 'four' || outcome === 'six') {
            s.consecutiveBoundaries++;
            s.consecutiveDots = 0;
        } else if (outcome === 'wicket') {
            s.consecutiveDots = 0;
            s.consecutiveBoundaries = 0;
        } else {
            s.consecutiveDots = 0;
            s.consecutiveBoundaries = 0;
        }

        s.momentum = this._deriveMomentum(s.recentOutcomes);

        // Over tracker — shared, bowling & batting both feed it
        const t = this._currentOverTracker;
        t.outcomes.push(outcome);
        t.runs       += Number(runs) || 0;
        t.wickets    += outcome === 'wicket' ? 1 : 0;
        t.boundaries += (outcome === 'four' || outcome === 'six') ? 1 : 0;
        t.dots       += outcome === 'dot' ? 1 : 0;
        t.wides      += outcome === 'wide' ? 1 : 0;
        t.noballs    += outcome === 'noball' ? 1 : 0;

        // Stamp current plan intents into the over tracker so we can grade them later
        if (this._state.batting.lastPlan?.intent) t.battingPlanIntent = this._state.batting.lastPlan.intent;
        if (this._state.bowling.lastPlan?.intent) t.bowlingPlanIntent = this._state.bowling.lastPlan.intent;
    }

    /**
     * Call this when an over completes (after the 6th legal delivery).
     * Seals the current over into history and grades the plans that were active.
     * @param {number} completedOver  - the over number that just finished (1-based)
     */
    recordOverComplete(completedOver) {
        const t = this._currentOverTracker;
        t.over = completedOver;

        // Grade plan effectiveness for both sides based on what actually happened
        t.battingPlanWorked = this._gradeBattingPlan(t);
        t.bowlingPlanWorked = this._gradeBowlingPlan(t);

        // Update side-state effectiveness memory
        this._state.batting.planEffectiveness = t.battingPlanWorked;
        this._state.bowling.planEffectiveness = t.bowlingPlanWorked;

        // Push to history, keep only the configured depth
        this._overHistory = [
            ...this._overHistory.slice(-(this.config.overHistoryDepth - 1)),
            { ...t }
        ];

        // Over boundary always forces a fresh plan next ball
        this._state.batting.lastPlanOver = -1;
        this._state.bowling.lastPlanOver = -1;

        // Start fresh tracker for next over
        this._currentOverTracker = this._freshOverTracker(completedOver + 1);
    }

    /**
     * Request a tactical plan from the LLM.
     * Always regenerates at the start of each new over.
     * Returns cached plan if still mid-over valid.
     *
     * @param {'batting'|'bowling'} planType
     * @param {object} payload — full game state from the engine
     * @returns {object|null}
     */
    async requestPlan(planType, payload) {
        if (!this.isEnabled()) return null;
        this.logStatusOnce();

        this._captureCompletedInningsSnapshot(payload);

        const s           = this._state[planType];
        const currentBall = this._extractBallNumber(payload);
        const currentOver = Number(payload?.over ?? payload?.match?.over ?? 1);

        // Return cached plan only if we're mid-over AND TTL hasn't expired AND no wicket fell
        if (this._isCachedPlanValid(s, currentBall, currentOver, payload)) {
            return s.lastPlan;
        }

        const pressure = this._computePressureIndex(planType, payload);
        const phase    = this._detectMatchPhase(payload);
        const prompt   = this._buildPrompt(planType, payload, pressure, phase, s, currentOver);

        const raw = await this._fetchWithRetry(prompt);
        if (!raw) return null;

        const parsed = this._safeParseJson(raw);
        if (!parsed) {
            console.warn('[LLM Tactical Brain] response parse failed. Falling back.');
            return null;
        }

        const plan = this._normalizePlan(planType, parsed, payload, pressure, phase);
        if (!plan) return null;

        s.lastPlan     = plan;
        s.lastPlanBall = currentBall;
        s.lastPlanOver = currentOver;
        s.planGenCount++;

        return plan;
    }

    _captureCompletedInningsSnapshot(payload) {
        const innings = Number(payload?.innings ?? payload?.match?.innings ?? 1);
        if (!Number.isFinite(innings)) return;

        if (innings !== this._lastSeenInnings && innings === 2 && !this._inningsArchive[1]) {
            this._inningsArchive[1] = {
                totalRuns: Math.max(0, Number(payload?.target ?? payload?.match?.target ?? 1) - 1),
                overs: this._overHistory.map((o) => ({ ...o })),
                summary: this._buildMatchReadContext('batting')
            };
        }

        this._lastSeenInnings = innings;
    }

    // ─────────────────────────────────────────────
    // Plan Effectiveness Grading
    // ─────────────────────────────────────────────

    _gradeBattingPlan(over) {
        const { runs, wickets, boundaries, dots, outcomes } = over;
        if (!outcomes.length) return null;
        const balls   = outcomes.filter(o => o !== 'wide' && o !== 'noball').length || 1;
        const runRate = (runs / balls) * 6;

        if (wickets >= 2)                      return 'backfired'; // multiple wickets = disaster
        if (runRate >= 10 && wickets === 0)    return 'worked';    // scored freely, no losses
        if (dots >= 4)                         return 'backfired'; // too many dots
        if (runRate >= 7.5)                    return 'worked';
        if (runRate < 5 && dots >= 3)          return 'mixed';
        return 'mixed';
    }

    _gradeBowlingPlan(over) {
        const { runs, wickets, boundaries, dots, outcomes } = over;
        if (!outcomes.length) return null;
        const balls   = outcomes.filter(o => o !== 'wide' && o !== 'noball').length || 1;
        const runRate = (runs / balls) * 6;

        if (wickets >= 2 && runRate <= 8)      return 'worked';    // wickets + economy
        if (boundaries >= 3)                   return 'backfired'; // got hit around
        if (dots >= 4 && wickets === 0)        return 'mixed';     // contained but no wicket
        if (runRate <= 6 && wickets >= 1)      return 'worked';
        if (runRate >= 12)                     return 'backfired';
        return 'mixed';
    }

    // ─────────────────────────────────────────────
    // Pressure & Phase Analysis
    // ─────────────────────────────────────────────

    _computePressureIndex(planType, payload) {
        try {
            const ballsLeft    = Number(payload?.ballsLeft   ?? payload?.match?.ballsLeft   ?? 60);
            const wicketsLeft  = Number(payload?.wicketsLeft ?? payload?.match?.wicketsLeft ?? 10);
            const target       = Number(payload?.target      ?? payload?.match?.target      ?? 0);
            const currentScore = Number(payload?.score       ?? payload?.match?.score       ?? 0);
            const overNumber   = Number(payload?.over        ?? payload?.match?.over        ?? 1);

            if (planType === 'batting') {
                if (target <= 0) {
                    const wicketFactor = 1 - (wicketsLeft / 10);
                    const phaseFactor  = overNumber > 15 ? 0.7 : overNumber > 10 ? 0.4 : 0.2;
                    return this._clampNum(wicketFactor * 0.4 + phaseFactor * 0.6, 0, 1, 0.3);
                }
                const runsNeeded   = target - currentScore;
                const rrr          = ballsLeft > 0 ? (runsNeeded / ballsLeft) * 6 : 99;
                const rrrDelta     = (rrr - 8.5) / 8;
                const wicketFactor = 1 - (wicketsLeft / 10) * 0.5;
                const ballFactor   = 1 - (ballsLeft / 120);
                return this._clampNum(
                    (rrrDelta * 0.5 + wicketFactor * 0.3 + ballFactor * 0.2) * this.config.pressureScaleSensitivity,
                    0, 1, 0.3
                );
            }

            if (target <= 0) return 0.3;
            const runsNeeded  = target - currentScore;
            const rrr         = ballsLeft > 0 ? (runsNeeded / ballsLeft) * 6 : 99;
            const bowlerRelax = rrr < 8 ? (8 - rrr) / 8 : 0;
            return this._clampNum(0.2 + bowlerRelax * 0.5 + (1 - wicketsLeft / 10) * 0.3, 0, 1, 0.3);
        } catch (_e) {
            return 0.3;
        }
    }

    _detectMatchPhase(payload) {
        const over = Number(payload?.over ?? payload?.match?.over ?? 1);
        const ballsLeft = Number(payload?.ballsLeft ?? payload?.match?.ballsLeft ?? 60);
        const totalOvers = Math.max(1, Number(payload?.formatOvers ?? payload?.totalOvers ?? payload?.match?.totalOvers ?? 20));

        const progress = this._clampNum(over / totalOvers, 0, 1, 0);
        const deathStart = Math.max(0.8, 1 - (4 / totalOvers)); // last 4 overs for longer formats, compressed for short formats
        const preDeathStart = Math.max(0.65, deathStart - 0.15);

        if (progress <= 0.28) return { id: 'powerplay', label: 'Powerplay', deathOver: false, fieldsUp: true, ballsLeft };
        if (progress <= 0.52) return { id: 'earlyMiddle', label: 'Early middle', deathOver: false, fieldsUp: false, ballsLeft };
        if (progress <= preDeathStart) return { id: 'lateMiddle', label: 'Middle overs', deathOver: false, fieldsUp: false, ballsLeft };
        if (progress <= deathStart) return { id: 'preDeath', label: 'Pre-death', deathOver: false, fieldsUp: false, ballsLeft };
        return { id: 'death', label: 'Death overs', deathOver: true, fieldsUp: false, ballsLeft };
    }

    _deriveMomentum(recentOutcomes) {
        if (!recentOutcomes.length) return 'neutral';
        let score = 0;
        recentOutcomes.forEach((o, i) => {
            const weight = (i + 1) / recentOutcomes.length;
            if (o === 'six')         score += 3 * weight;
            else if (o === 'four')   score += 2 * weight;
            else if (o === 'single') score += 0.5 * weight;
            else if (o === 'dot')    score -= 0.5 * weight;
            else if (o === 'wicket') score -= 4 * weight;
        });
        if (score > 2)    return 'hot';
        if (score < -1.5) return 'cold';
        return 'neutral';
    }

    _isCachedPlanValid(s, currentBall, currentOver, payload) {
        if (!s.lastPlan || s.lastPlanBall < 0) return false;
        // New over always invalidates — we re-plan every over
        if (s.lastPlanOver !== currentOver) return false;
        const age = currentBall - s.lastPlanBall;
        if (age >= this.config.maxPlanAge) return false;
        if (age < s.lastPlan.windowBalls && age < this.config.planTTLBalls) {
            // Mid-over wicket also invalidates
            const lastOutcome = s.recentOutcomes[s.recentOutcomes.length - 1];
            if (lastOutcome === 'wicket') return false;
            return true;
        }
        return false;
    }

    _extractBallNumber(payload) {
        try {
            const over = Number(payload?.over ?? payload?.match?.over ?? 1);
            const ball = Number(payload?.ball ?? payload?.match?.ball ?? 0);
            return (over - 1) * 6 + ball;
        } catch (_e) {
            return 0;
        }
    }

    // ─────────────────────────────────────────────
    // Over History Summaries for the Prompt
    // ─────────────────────────────────────────────

    _buildOverHistorySummary(planType) {
        if (!this._overHistory.length) return null;
        return this._overHistory.map(o => {
            const balls      = o.outcomes.filter(x => x !== 'wide' && x !== 'noball').length || 1;
            const runRate    = ((o.runs / balls) * 6).toFixed(1);
            const planIntent = planType === 'batting' ? o.battingPlanIntent : o.bowlingPlanIntent;
            const planResult = planType === 'batting' ? o.battingPlanWorked : o.bowlingPlanWorked;
            const resultTag  = planResult === 'worked'    ? '✓ plan worked'
                             : planResult === 'backfired' ? '✗ plan backfired'
                             : planResult === 'mixed'     ? '~ mixed results'
                             : 'no plan active';
            return {
                over: o.over, runs: o.runs, wickets: o.wickets,
                boundaries: o.boundaries, dots: o.dots, runRate,
                balls: o.outcomes, planIntent: planIntent ?? 'none', planResult: resultTag,
            };
        });
    }

    _buildMatchReadContext(planType) {
        if (!this._overHistory.length) return 'Match just started — no over history yet.';

        const worked    = this._overHistory.filter(o =>
            (planType === 'batting' ? o.battingPlanWorked : o.bowlingPlanWorked) === 'worked').length;
        const backfired = this._overHistory.filter(o =>
            (planType === 'batting' ? o.battingPlanWorked : o.bowlingPlanWorked) === 'backfired').length;
        const total     = this._overHistory.length;

        const totalRuns    = this._overHistory.reduce((a, o) => a + o.runs, 0);
        const totalWickets = this._overHistory.reduce((a, o) => a + o.wickets, 0);
        const totalBalls   = this._overHistory.reduce((a, o) =>
            a + o.outcomes.filter(x => x !== 'wide' && x !== 'noball').length, 0) || 1;
        const overallRR    = ((totalRuns / totalBalls) * 6).toFixed(1);

        const recent   = this._overHistory.slice(-3);
        const lastOver = recent[recent.length - 1];
        const lastBalls = lastOver.outcomes.filter(x => x !== 'wide' && x !== 'noball').length || 1;
        const lastRR    = ((lastOver.runs / lastBalls) * 6).toFixed(1);
        const trend     = recent.length >= 2 ? this._detectTrend(recent, planType) : 'stable';

        return {
            oversSeen: total,
            overallRunRate: overallRR,
            totalRuns,
            totalWickets,
            plansWorked: worked,
            plansBackfired: backfired,
            recentTrend: trend,
            lastOver: {
                over:       lastOver.over,
                runs:       lastOver.runs,
                wickets:    lastOver.wickets,
                runRate:    lastRR,
                boundaries: lastOver.boundaries,
                dots:       lastOver.dots,
                planIntent: planType === 'batting' ? lastOver.battingPlanIntent : lastOver.bowlingPlanIntent,
                planResult: planType === 'batting' ? lastOver.battingPlanWorked : lastOver.bowlingPlanWorked,
            }
        };
    }

    _detectTrend(recentOvers, planType) {
        const calc = o => {
            const b = o.outcomes.filter(x => x !== 'wide' && x !== 'noball').length || 1;
            return (o.runs / b) * 6;
        };
        const last   = calc(recentOvers[recentOvers.length - 1]);
        const before = recentOvers.slice(0, -1).reduce((a, o) => a + calc(o), 0) / (recentOvers.length - 1);
        const delta  = last - before;

        if (planType === 'batting') {
            if (delta > 2)  return 'accelerating';
            if (delta < -2) return 'slowing down';
            return 'stable';
        } else {
            if (delta > 2)  return 'haemorrhaging runs';
            if (delta < -2) return 'tightening up';
            return 'steady';
        }
    }

    // ─────────────────────────────────────────────
    // Prompt Construction
    // ─────────────────────────────────────────────

    _buildPrompt(planType, payload, pressure, phase, memoryState, currentOver) {
        const momentum       = memoryState.momentum;
        const recentOutcomes = memoryState.recentOutcomes;
        const lastPlan       = this.config.enablePlanMemory ? memoryState.lastPlan : null;
        const planEffect     = memoryState.planEffectiveness;
        const overHistory    = this._buildOverHistorySummary(planType);
        const matchRead      = this._buildMatchReadContext(planType);
        const innings = Number(payload?.innings ?? payload?.match?.innings ?? 1);
        const archivedFirstInnings = innings === 2 ? this._inningsArchive[1] || null : null;

        const effectivenessNote = planEffect === 'worked'
            ? 'Your last plan worked well — build on it or subtly evolve it.'
            : planEffect === 'backfired'
            ? 'Your last plan backfired — think about what went wrong and adjust clearly.'
            : planEffect === 'mixed'
            ? 'Mixed results last over — not a disaster but not ideal. Refine, don\'t overhaul.'
            : null;
        const lastOverSummary = matchRead && typeof matchRead === 'object' && matchRead.lastOver
            ? {
                over: matchRead.lastOver.over,
                runs: matchRead.lastOver.runs,
                wickets: matchRead.lastOver.wickets,
                boundaries: matchRead.lastOver.boundaries,
                dots: matchRead.lastOver.dots,
                runRate: matchRead.lastOver.runRate,
                planIntent: matchRead.lastOver.planIntent,
                planResult: matchRead.lastOver.planResult
            }
            : null;

        const sharedContext = {
            innings: payload?.innings ?? payload?.match?.innings ?? null,
            formatOvers: payload?.formatOvers ?? payload?.match?.formatOvers ?? payload?.totalOvers ?? payload?.match?.totalOvers ?? null,
            currentOver,
            ball: payload?.ball ?? payload?.match?.ball,
            ballsRemaining: phase.ballsLeft,
            matchPhase: phase.label,
            score: payload?.score ?? payload?.match?.score,
            target: payload?.target ?? payload?.match?.target ?? null,
            runsNeeded: payload?.runsNeeded ?? payload?.match?.runsNeeded ?? null,
            chaseContext: (payload?.innings ?? payload?.match?.innings) === 2
                ? `Second innings chase/defence context. Target is ${payload?.target ?? payload?.match?.target ?? 'unknown'} and runs still needed are ${payload?.runsNeeded ?? payload?.match?.runsNeeded ?? 'unknown'}.`
                : `First innings target-setting context. Current projected task is to build a defendable total.`,
            wicketsInHand: payload?.wicketsLeft ?? payload?.match?.wicketsLeft,
            requiredRunRate: this._safeRRR(payload),
            currentRunRate: this._safeCRR(payload),
            pressureIndex: Math.round(pressure * 100) / 100,
            momentum,
            lastOverSummary,
            recentBalls: recentOutcomes.slice(-6),
            pitchConditions: payload?.pitch ?? payload?.match?.pitch ?? null,
            dew: payload?.dew ?? payload?.match?.dew ?? false,
            firstInningsSummary: archivedFirstInnings ? {
                totalRuns: archivedFirstInnings.totalRuns,
                oversBowled: archivedFirstInnings.overs?.length || 0,
                summary: archivedFirstInnings.summary,
                overByOver: archivedFirstInnings.overs?.map((o) => ({
                    over: o.over,
                    runs: o.runs,
                    wickets: o.wickets,
                    boundaries: o.boundaries,
                    dots: o.dots
                })) || []
            } : null,
        };
        const explicitOverContext = {
            instruction: 'Read these numbers literally on every call.',
            matchOvers: payload?.formatOvers ?? payload?.match?.formatOvers ?? payload?.totalOvers ?? payload?.match?.totalOvers ?? null,
            currentOver,
            ballsRemaining: phase.ballsLeft,
            runsNeeded: payload?.runsNeeded ?? payload?.match?.runsNeeded ?? null,
            reminder: `This match is ${payload?.formatOvers ?? payload?.match?.formatOvers ?? payload?.totalOvers ?? payload?.match?.totalOvers ?? 'unknown'} overs long, the current over is ${currentOver}, and the batting side currently needs ${payload?.runsNeeded ?? payload?.match?.runsNeeded ?? 'unknown'} runs.`
        };
        const fullMatchContextSnapshot = {
            instruction: 'This is the full context snapshot for this over. Use all of it before making the plan.',
            innings: payload?.innings ?? payload?.match?.innings ?? null,
            target: payload?.target ?? payload?.match?.target ?? null,
            runsNeeded: payload?.runsNeeded ?? payload?.match?.runsNeeded ?? null,
            totalOvers: payload?.formatOvers ?? payload?.match?.formatOvers ?? payload?.totalOvers ?? payload?.match?.totalOvers ?? null,
            currentOver,
            ballsRemaining: phase.ballsLeft,
            score: payload?.scoreText ?? payload?.score ?? payload?.match?.scoreText ?? payload?.match?.score ?? null,
            runsNow: payload?.runs ?? payload?.match?.runs ?? null,
            wicketsNow: payload?.wickets ?? payload?.match?.wickets ?? null,
            wicketsInHand: payload?.wicketsInHand ?? payload?.wicketsLeft ?? payload?.match?.wicketsInHand ?? payload?.match?.wicketsLeft ?? null,
            runRate: payload?.runRate ?? payload?.match?.runRate ?? null,
            requiredRunRate: this._safeRRR(payload),
            pressure: Math.round(pressure * 100) / 100,
            momentum,
            lastOverSummary,
            firstInningsSummary: archivedFirstInnings ? {
                totalRuns: archivedFirstInnings.totalRuns,
                summary: archivedFirstInnings.summary,
                overByOver: archivedFirstInnings.overs?.map((o) => ({
                    over: o.over,
                    runs: o.runs,
                    wickets: o.wickets,
                    boundaries: o.boundaries,
                    dots: o.dots
                })) || []
            } : null,
            recentBalls: recentOutcomes.slice(-6)
        };

        if (planType === 'batting') {
            const batter  = payload?.batter  ?? {};
            const partner = payload?.partner ?? {};

            return JSON.stringify({
            task: 'You are a sharp, instinctive cricket batting coach. Study the live match situation — including what has happened over the last few overs — and produce a tactical plan for this over. Use formatOvers as authoritative and treat match length literally. If this is a 5-over match, over 3 is not early and over 5 is full finishing mode. Do not say "early days", "no need to rush", "rotate for now", or anything similarly passive in a short match unless the batting side is massively ahead. Your plan must feel natural, reactive, and alive to what\'s actually happening in the match.',

                philosophy: [
                    'Great batting is about reading the match, not just executing patterns.',
                    'Momentum is real — a batter in flow should be set free; one under pressure needs a reset ball.',
                    'Required run rate is law in a chase — every dot ball is a crisis deferred.',
                    'Avoid mechanical repetition — a predictable batter is a dismissed batter.',
                    'In the powerplay, field placements are gifts — exploit gaps aggressively.',
                    'Death overs are about intent first, shot selection second.',
                    'Sound like a living competitor, not a dashboard. You care about winning this contest.',
                    'Match length is literal, not cosmetic. In a 5-over match, over 3 is already the back half of the innings.',
                    'In short matches, passive accumulation is usually wrong unless the scoreboard clearly says you are safe.',
                ],

                situationalNuance: this._buildBattingSituationalNuance(pressure, phase, momentum, memoryState),

                matchContext: sharedContext,
                explicitOverContext,
                fullMatchContextSnapshot,

                formatAwareness: {
                    instruction: 'Read the format literally and plan off the exact innings length, not default T20 pacing.',
                    formatOvers: payload?.formatOvers ?? null,
                    currentOver: currentOver,
                    ballsRemaining: phase.ballsLeft,
                    reminder: (payload?.formatOvers ?? 20) <= 6
                        ? 'Short-format sprint: there is less time than a normal T20 middle phase.'
                        : 'Standard format pacing applies.'
                },

                inningsAwareness: (payload?.innings ?? 1) === 2
                    ? {
                        instruction: 'You are batting second. The target is not abstract; it is the scoreboard you must chase right now.',
                        targetToChase: payload?.target ?? null,
                        runsStillNeeded: payload?.runsNeeded ?? null,
                        scoreNow: payload?.score ?? null,
                        ballsRemaining: phase.ballsLeft,
                        requiredRunRate: this._safeRRR(payload),
                        reminder: 'When batting second, always speak and plan against the exact remaining runs needed, not just the original target, and remember what happened in the full first innings.'
                    }
                    : {
                        instruction: 'You are batting first. You are creating the target the opponent must chase.',
                        currentScore: payload?.score ?? null,
                        ballsRemaining: phase.ballsLeft,
                        reminder: 'When batting first, think about what total will put the opponent under pressure later.'
                    },

                matchHistorySoFar: {
                    note: 'Use this to assess how things have gone, whether plans have worked, and what the trend is.',
                    summary: matchRead,
                    overByOver: overHistory,
                },

                planEvaluation: effectivenessNote,

                batter: {
                    name: batter.name,
                    style: batter.style,
                    attributes: batter.attributes,
                    signatureShots: batter.signatureShots,
                    weaknesses: batter.weaknesses,
                    allowedShots: batter.allowedShots ?? payload?.allowedShots,
                    currentForm: batter.form ?? null,
                    ballsFaced: batter.ballsFaced ?? null,
                },

                partnerContext: partner.name ? {
                    name: partner.name, style: partner.style, ballsFaced: partner.ballsFaced ?? null,
                } : null,

                bowlerFaced: payload?.bowler ? {
                    name: payload.bowler.name, style: payload.bowler.style,
                    recentEconomy: payload.bowler.economy ?? null,
                    recentWickets: payload.bowler.wickets ?? null,
                    signatures: payload.bowler.signatureDeliveries ?? null,
                } : null,

                previousPlan: lastPlan ? {
                    note: 'This was last over\'s plan. Use the plan evaluation above to decide whether to evolve, adapt, or contrast it.',
                    plan: { intent: lastPlan.intent, riskBias: lastPlan.riskBias, preferShots: lastPlan.preferShots },
                } : null,

                responseFormat: {
                    strictJson: true,
                    keys: {
                        windowBalls: 'integer 3–6: how many balls this plan covers',
                        riskBias:    'float -0.35 to 0.35: negative = safety, positive = attack',
                        intent:      'short tactical phrase',
                        preferShots: 'array of shot ids from allowedShots to actively seek',
                        avoidShots:  'array of shot ids from allowedShots to consciously suppress',
                        targetZones: 'array of up to 3 field zone strings',
                        narrative:   'one short human sentence explaining the tactical idea in live-match language, not analyst language',
                        read:        'one or two natural, conversational sentences in first person as a competitive cricket mind living this game in real time. React emotionally but plausibly to what just happened: regret bad calls, enjoy plans that work, acknowledge pressure, threaten a pivot, or stay calm when in control. Be invested in beating the opponent. When discussing a chase, refer to runs still needed, not the original target total, unless both are useful. Respect the exact match length. In a 5-over game, do not call over 3 early and do not suggest passive strike rotation unless the batting side is already clearly ahead. No robotic labels, no bullet points, no JSON-like phrasing.',
                    }
                }
            });
        }

        // Bowling
        const bowler = payload?.bowler ?? {};
        const batter  = payload?.batter ?? {};

        return JSON.stringify({
            task: 'You are a shrewd cricket bowling tactician. Look at what\'s happened over the last few overs, assess whether your plans have worked, and design a bowling plan for this over. Use formatOvers as authoritative and adapt aggression to match length (for example, 5-over games have compressed phases). Think in sequences. React to what the match is telling you. If this is the second innings, you are defending or attacking a real target and must know exactly what score your side made and what the batting side still needs.',

            philosophy: [
                'Every delivery is either a setup ball or a target ball — know which one you are bowling.',
                'In death overs, boundary denial with variation beats pace without thought.',
                'Bowl to the match situation, not just to the batter\'s weakness.',
                'Under pressure, discipline and precision beat experimentation.',
                'Never bowl the same ball twice consecutively to a settled batter.',
                'Sound like a living competitor, not a dashboard. You care about winning this contest.',
                    'Match length is literal, not cosmetic. In a 5-over match, over 3 is already the back half of the innings.',
                    'In short matches, passive accumulation is usually wrong unless the scoreboard clearly says you are safe.',
            ],

            situationalNuance: this._buildBowlingSituationalNuance(pressure, phase, momentum, memoryState),

            matchContext: sharedContext,
            explicitOverContext,
            fullMatchContextSnapshot,

                formatAwareness: {
                    instruction: 'Read the format literally and plan off the exact innings length, not default T20 pacing.',
                    formatOvers: payload?.formatOvers ?? null,
                    currentOver: currentOver,
                    ballsRemaining: phase.ballsLeft,
                    reminder: (payload?.formatOvers ?? 20) <= 6
                        ? 'Short-format sprint: there is less time than a normal T20 middle phase.'
                        : 'Standard format pacing applies.'
                },

            inningsAwareness: (payload?.innings ?? 1) === 2
                ? {
                    instruction: 'You are bowling in the chase. You are defending a target your side already posted.',
                    targetToDefend: payload?.target ?? null,
                    runsStillNeededByBattingSide: payload?.runsNeeded ?? null,
                    scoreNow: payload?.score ?? null,
                    ballsRemaining: phase.ballsLeft,
                    requiredRunRate: this._safeRRR(payload),
                    reminder: 'Always plan with both the original target and the exact runs still needed right now. When you describe the chase state, talk about remaining runs needed, not just the full target.'
                }
                : {
                    instruction: 'You are bowling in the first innings. You are shaping what target the batting side can set.',
                    currentScoreConceded: payload?.score ?? null,
                    ballsRemaining: phase.ballsLeft,
                    reminder: 'What you concede now becomes the target later.'
                },

            matchHistorySoFar: {
                note: 'Use this to assess how things have gone, whether plans have worked, and what the trend is.',
                summary: matchRead,
                overByOver: overHistory,
            },

            planEvaluation: effectivenessNote,

            bowler: {
                name: bowler.name, style: bowler.style, attributes: bowler.attributes,
                allowedDeliveries: bowler.allowedDeliveries ?? payload?.allowedDeliveries,
                economy: bowler.economy ?? null, wickets: bowler.wickets ?? null,
                currentSpell: bowler.currentSpell ?? null, fatigue: bowler.fatigue ?? null,
            },

            batterProfile: batter.name ? {
                name: batter.name, style: batter.style,
                weaknesses: batter.weaknesses ?? null, ballsFaced: batter.ballsFaced ?? null,
            } : null,

            fielding: payload?.fielding ?? null,

            previousPlan: lastPlan ? {
                note: 'Last over\'s bowling plan. React honestly — did it hold up? What needs to change?',
                plan: { intent: lastPlan.intent, riskBias: lastPlan.riskBias, preferDeliveries: lastPlan.preferDeliveries },
            } : null,

            responseFormat: {
                strictJson: true,
                keys: {
                    windowBalls:      'integer 3–6: how many balls this plan covers',
                    riskBias:         'float -0.35 to 0.35: negative = containment, positive = wicket-hunt',
                    intent:           'short tactical phrase',
                    preferDeliveries: 'array of delivery ids from allowedDeliveries to prioritise',
                    avoidDeliveries:  'array of delivery ids from allowedDeliveries to suppress',
                    attackZones:      'array of up to 3 pitch/field zones to target',
                    narrative:        'one short human sentence explaining the tactical idea in live-match language, not analyst language',
                    read:             'one or two natural, conversational sentences in first person as a competitive cricket mind living this game in real time. React emotionally but plausibly to what just happened: enjoy pressure, regret being hit, feel a wicket opening, acknowledge when a plan got exposed, and state whether you are doubling down or pivoting. Be invested in beating the opponent. When discussing a chase, refer to runs still needed right now, not just the original target total, unless both are useful. Respect the exact match length. In a 5-over game, do not call over 3 early and do not suggest passive strike rotation unless the batting side is already clearly ahead. No robotic labels, no bullet points, no JSON-like phrasing.',
                }
            }
        });
    }

    _buildBattingSituationalNuance(pressure, phase, momentum, memoryState) {
        const nuances = [];
        const { consecutiveDots, consecutiveBoundaries } = memoryState;
        if (consecutiveDots >= 3)       nuances.push(`⚠ ${consecutiveDots} consecutive dots — the batter is under real pressure. A reset single or a well-timed boundary attempt is critical.`);
        if (consecutiveBoundaries >= 2) nuances.push(`🔥 ${consecutiveBoundaries} boundaries in a row — batter is in full flow. Stay aggressive but don't give it away.`);
        if (pressure > 0.75)            nuances.push('CRISIS mode: required rate is steep, balls are short. Every dot ball is a disaster. The plan must prioritise boundary scoring.');
        if (pressure < 0.25)            nuances.push('Comfortable position: no need to force the issue. Rotate strike, tire the bowler, pick the right ball to attack.');
        if (momentum === 'cold')         nuances.push('Momentum has swung against the batting side. Consolidation and intent-reset needed before re-launching attack.');
        if (momentum === 'hot')          nuances.push('Batting team is in full flow. Ride the wave — keep the pressure on the fielding side.');
        if (phase.deathOver)            nuances.push('Death overs: every ball must score. Positive intent even on good balls.');
        if (phase.id === 'powerplay')   nuances.push('Powerplay: fielding restrictions are a gift. Attack the gaps, back aerial shots, build a platform.');
        return nuances.length ? nuances : ['Standard conditions — read the bowler and respond to what\'s on the pitch.'];
    }

    _buildBowlingSituationalNuance(pressure, phase, momentum, memoryState) {
        const nuances = [];
        const { consecutiveDots, consecutiveBoundaries } = memoryState;
        if (consecutiveBoundaries >= 2) nuances.push(`🚨 ${consecutiveBoundaries} consecutive boundaries — the batter has the upper hand. Change length, pace or angle NOW.`);
        if (consecutiveDots >= 3)       nuances.push(`💪 ${consecutiveDots} consecutive dots — in control. The trap is set. Consider the wicket ball.`);
        if (pressure > 0.75)            nuances.push('Batting team is desperate — they WILL swing. Variations and slower balls are weapons. Hold your length, invite the mistake.');
        if (pressure < 0.25)            nuances.push('Low pressure on batting side — they\'re comfortable. A wicket changes everything.');
        if (momentum === 'cold')         nuances.push('Bowling side has the momentum. Don\'t give a free hit or easy single.');
        if (momentum === 'hot')          nuances.push('Batting team has momentum. Change the rhythm — pace, field, or a tight dot burst.');
        if (phase.deathOver)            nuances.push('Death over bowling: mix yorkers, slower balls, bouncers. Boundary denial first, wicket second.');
        if (phase.id === 'powerplay')   nuances.push('Powerplay bowling: full length to tempt edges, mix in the short ball. Get them playing aerial shots.');
        return nuances.length ? nuances : ['Balanced approach — build pressure through consistency before unleashing the variation.'];
    }

    // ─────────────────────────────────────────────
    // Network
    // ─────────────────────────────────────────────

    async _fetchWithRetry(prompt) {
        let res = await this._fetchWithTimeout(prompt, this.config.timeoutMs);
        if (!res && this.config.timeoutMs < 12000) {
            res = await this._fetchWithTimeout(prompt, Math.min(12000, this.config.timeoutMs * 2));
        }
        if (!res) {
            console.warn('[LLM Tactical Brain] timed out after retry. Falling back.');
            return null;
        }
        if (!res.ok) {
            let detail = '';
            try {
                const errJson = await res.json();
                detail = errJson?.error ? ` detail=${String(errJson.error).slice(0, 220)}` : '';
            } catch (_e) { /* ignore */ }
            console.warn(`[LLM Tactical Brain] request failed status=${res.status}.${detail} Falling back.`);
            return null;
        }
        try {
            const json = await res.json();
            return json?.content ?? null;
        } catch (_e) {
            console.warn('[LLM Tactical Brain] JSON parse of response failed.');
            return null;
        }
    }

    async _fetchWithTimeout(prompt, timeoutMs) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: this.config.model, prompt }),
                signal: controller.signal,
            });
            return res;
        } catch (err) {
            const isAbort = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('aborted');
            if (isAbort) return null;
            const msg = err?.message ? ` detail=${err.message}` : '';
            console.warn(`[LLM Tactical Brain] fetch error.${msg} Falling back.`);
            return null;
        } finally {
            clearTimeout(timeout);
        }
    }

    // ─────────────────────────────────────────────
    // Plan Normalisation
    // ─────────────────────────────────────────────

    _normalizePlan(planType, parsed, payload, pressure, phase) {
        try {
            const base = {
                windowBalls: this._clampInt(parsed?.windowBalls, 3, 6, 6),
                riskBias:    this._applyPressureTilt(
                                 this._clampNum(parsed?.riskBias, -0.35, 0.35, 0),
                                 pressure, planType
                             ),
                intent:    this._normalizeIntent(parsed?.intent),
                narrative: typeof parsed?.narrative === 'string' ? parsed.narrative.trim().slice(0, 300) : '',
                read:      typeof parsed?.read      === 'string' ? parsed.read.trim().slice(0, 400)      : '',
                phase:     phase.id,
                pressure:  Math.round(pressure * 100) / 100,
                momentum:  this._state[planType].momentum,
                generatedAt: Date.now(),
            };

            if (planType === 'batting') {
                const allowed = this._getAllowedSet(payload, 'shots');
                return {
                    ...base,
                    preferShots:  this._filterAllowed(parsed?.preferShots, allowed),
                    avoidShots:   this._filterAllowed(parsed?.avoidShots, allowed),
                    targetZones:  this._normalizeStringArray(parsed?.targetZones, 3),
                };
            }

            const allowed = this._getAllowedSet(payload, 'deliveries');
            return {
                ...base,
                preferDeliveries: this._filterAllowed(parsed?.preferDeliveries, allowed),
                avoidDeliveries:  this._filterAllowed(parsed?.avoidDeliveries, allowed),
                attackZones:      this._normalizeStringArray(parsed?.attackZones, 3),
            };
        } catch (err) {
            console.warn('[LLM Tactical Brain] normalizePlan error:', err?.message);
            return null;
        }
    }

    _applyPressureTilt(llmBias, pressure, planType) {
        const tilt = planType === 'batting'
            ? (pressure - 0.5) * 0.25
            : -(pressure - 0.5) * 0.15;
        return this._clampNum(llmBias + tilt, -0.35, 0.35, llmBias);
    }

    _getAllowedSet(payload, kind) {
        const arr = kind === 'shots'
            ? (payload?.allowedShots ?? payload?.batter?.allowedShots ?? [])
            : (payload?.allowedDeliveries ?? payload?.bowler?.allowedDeliveries ?? []);
        return new Set(arr);
    }

    _filterAllowed(arr, allowedSet) {
        if (!Array.isArray(arr)) return [];
        return arr
            .map(x => this._normalizeToken(x))
            .filter(x => allowedSet.size === 0 || allowedSet.has(x))
            .filter((x, i, self) => x && self.indexOf(x) === i)
            .slice(0, 6);
    }

    _normalizeToken(v) {
        if (typeof v === 'string') return v.trim();
        if (v && typeof v === 'object') {
            if (typeof v.id    === 'string') return v.id.trim();
            if (typeof v.name  === 'string') return v.name.trim().toLowerCase().replace(/\s+/g, '_');
            if (typeof v.value === 'string') return v.value.trim();
        }
        return String(v ?? '').trim();
    }

    _normalizeIntent(v) {
        if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 120);
        if (Array.isArray(v) && v.length > 0)  return this._normalizeToken(v[0]) || 'balanced';
        if (v && typeof v === 'object') {
            const t = this._normalizeToken(v.intent || v.value || v.name || v.id);
            return t || 'balanced';
        }
        return 'balanced';
    }

    _normalizeStringArray(arr, limit) {
        if (!Array.isArray(arr)) return [];
        return arr
            .map(x => this._normalizeToken(x))
            .filter((x, i, self) => x && self.indexOf(x) === i)
            .slice(0, limit);
    }

    // ─────────────────────────────────────────────
    // Math helpers
    // ─────────────────────────────────────────────

    _safeRRR(payload) {
        try {
            const target    = Number(payload?.target    ?? payload?.match?.target    ?? 0);
            const score     = Number(payload?.score     ?? payload?.match?.score     ?? 0);
            const ballsLeft = Number(payload?.ballsLeft ?? payload?.match?.ballsLeft ?? 60);
            if (!target || ballsLeft <= 0) return null;
            return Math.round(((target - score) / ballsLeft) * 6 * 100) / 100;
        } catch (_e) { return null; }
    }

    _safeCRR(payload) {
        try {
            const score       = Number(payload?.score     ?? payload?.match?.score     ?? 0);
            const ballsLeft   = Number(payload?.ballsLeft ?? payload?.match?.ballsLeft ?? 60);
            const ballsBowled = 120 - ballsLeft;
            if (ballsBowled <= 0) return null;
            return Math.round((score / ballsBowled) * 6 * 100) / 100;
        } catch (_e) { return null; }
    }

    _clampNum(v, min, max, fallback) {
        const n = Number(v);
        if (!Number.isFinite(n)) return fallback;
        return Math.max(min, Math.min(max, n));
    }

    _clampInt(v, min, max, fallback) {
        const n = Math.round(Number(v));
        if (!Number.isFinite(n)) return fallback;
        return Math.max(min, Math.min(max, n));
    }

    _safeParseJson(raw) {
        if (raw == null) return null;
        if (typeof raw === 'object') return raw;
        const text = String(raw).trim();
        if (!text) return null;
        try { return JSON.parse(text); } catch (_e) { /* fall through */ }
        const start = text.indexOf('{');
        const end   = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            try { return JSON.parse(text.slice(start, end + 1)); } catch (_e) { /* fall through */ }
        }
        return null;
    }

    logStatusOnce() {
        if (this.loggedStatus) return;
        this.loggedStatus = true;
        try {
            console.info(
                `[LLM Tactical Brain] enabled=true endpoint=${this.config.endpoint} model=${this.config.model} planCadence=perOver overHistory=${this.config.overHistoryDepth}overs`
            );
        } catch (_e) { /* no-op */ }
    }

    // ─────────────────────────────────────────────
    // Diagnostics
    // ─────────────────────────────────────────────

    getDebugSnapshot() {
        const summarise = s => ({
            momentum:              s.momentum,
            recentOutcomes:        [...s.recentOutcomes],
            consecutiveDots:       s.consecutiveDots,
            consecutiveBoundaries: s.consecutiveBoundaries,
            planGenCount:          s.planGenCount,
            planEffectiveness:     s.planEffectiveness,
            lastPlanRead:          s.lastPlan?.read ?? null,
            lastPlanOver:          s.lastPlanOver,
        });
        return {
            config:       { ...this.config },
            battingState: summarise(this._state.batting),
            bowlingState: summarise(this._state.bowling),
            overHistory:  this._overHistory.map(o => ({
                over:              o.over,
                runs:              o.runs,
                wickets:           o.wickets,
                runRate:           ((o.runs / Math.max(1, o.outcomes.filter(x => x !== 'wide' && x !== 'noball').length)) * 6).toFixed(1),
                battingPlanWorked: o.battingPlanWorked,
                bowlingPlanWorked: o.bowlingPlanWorked,
            })),
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TacticalBrainClient };
}





