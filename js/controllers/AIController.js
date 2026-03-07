// ============================================================
// CRICKET LEGENDS — AI Controller (New Architecture)
// ============================================================

class AIController {
    constructor(engine, battingSystem, bowlingSystem) {
        this.engine = engine;
        this.battingSystem = battingSystem;
        this.bowlingSystem = bowlingSystem;
        this.tacticalBrain = (typeof TacticalBrainClient !== 'undefined')
            ? new TacticalBrainClient(typeof window !== 'undefined' ? window.GAME_LLM_CONFIG : {})
            : null;
        this.battingPlan = null;
        this.bowlingPlan = null;
        this.battingPlanUntilBall = -1;
        this.bowlingPlanUntilBall = -1;
        this.battingPlanInFlight = false;
        this.bowlingPlanInFlight = false;
        this.onTacticalThought = null;
        this.loggedFallbackOnce = false;
        this.lastThoughtAt = 0;
        this.lastThoughtSignature = '';
        this.thoughtMinIntervalMs = 18000;
        this.overPlanPromise = null;
        this.overPlanKey = '';
        this.forceReplanBatting = false;
        this.forceReplanBowling = false;
        this.planCadence = {
            batting: { over: -1, count: 0 },
            bowling: { over: -1, count: 0 }
        };
        this.planStats = {
            batting: { total: 0, preferredHits: 0, avoidBreaches: 0 },
            bowling: { total: 0, preferredHits: 0, avoidBreaches: 0 }
        };

        try {
            const active = !!(this.tacticalBrain && this.tacticalBrain.isEnabled());
            if (active) {
                console.info('[AIController] LLM tactical planning is ACTIVE.');
            } else {
                console.info('[AIController] LLM tactical planning is INACTIVE. Using deterministic fallback.');
            }
        } catch (_err) {
            // no-op
        }
    }

    // ── Pre-Match: Toss Decision ───────────────────────────
    chooseBatOrBowl(context) {
        const pitchId = this.engine.pitch?.id || 'batting';
        let batChance = 0.5;

        switch(pitchId) {
            case 'batting': batChance = 0.8; break; // Flat track: Bat
            case 'pace':    batChance = 0.3; break; // Green track: Bowl
            case 'spin':    batChance = 0.6; break; // Dust bowl: Bat before it breaks
            case 'worn':    batChance = 0.7; break; // Cracking: Bat first
        }

        return Math.random() < batChance ? 'bat' : 'bowl';
    }

    // ── AI Batting Decision ────────────────────────────────
    chooseShot(batter, delivery, context) {
        this.maybeRefreshBattingPlan(batter, delivery, context);
        const tendency = batter.aiTendency || {};
        const llmActive = !!(this.tacticalBrain && this.tacticalBrain.isEnabled());
        const hasLlmPlan = llmActive && !!this.battingPlan;
        
        // 1. Determine aggression level based on phase and tendency
        let aggression = tendency.aggression || 0.5;

        // Start slow tendency
        if (tendency.startSlow && context.currentBatterBalls < (tendency.accelerateAfterBalls || 20)) {
            aggression *= 0.5;
        }

        // Finisher mode
        if (tendency.finisherMode && context.currentOver >= this.engine.totalOvers - 5) {
            aggression = 0.85;
        }

        // Static tactical shaping disabled by request.
        // if (!hasLlmPlan) { ... }

        aggression = Math.max(0.1, Math.min(1.0, aggression));

        // 2. Select shot type
        const shots = typeof getShotsForBatter === 'function'
            ? [...(getShotsForBatter(batter) || [])]
            : [...(typeof SHOT_TYPES !== 'undefined' ? SHOT_TYPES : [])];
        if (shots.length === 0) return null; // fallback if data not loaded

        const weights = {};
        shots.forEach(shot => {
            let weight = 1;

            // Base aggression alignment
            if (shot.risk <= 0.15 && aggression < 0.4) weight += 3;
            if (shot.risk > 0.3 && aggression > 0.7) weight += 3;
            if (shot.risk > 0.4 && aggression > 0.85) weight += 4;

            // Delivery-shot matchup
            const length = delivery?.length || delivery?.delivery?.length;
            if (shot.id === 'pull' && length === 'short') weight += 5;
            if (shot.id === 'drive' && (length === 'full_driving' || length === 'good')) weight += 3;
            if (shot.id === 'defensive' && delivery.difficulty > 0.6) weight += 4;
            if (shot.id === 'sweep' && !delivery.isPace) weight += 2;

            // Player-specific biases
            if (tendency.loftedChance && shot.id === 'lofted') weight += tendency.loftedChance * 10;
            if (tendency.noSweep && shot.id === 'sweep') weight = 0;
            if (batter.id === 'devilliers' && shot.category === 'innovative') weight += 3;

            // Difficulty constraint
            if (this.engine.difficulty === 'easy' && shot.category === 'innovative') weight *= 0.2;

            if (this.battingPlan) {
                if (this.battingPlan.preferShots?.includes(shot.id)) weight *= 1.55;
                if (this.battingPlan.avoidShots?.includes(shot.id)) weight *= 0.35;
                weight *= 1 + (this.battingPlan.riskBias || 0) * (shot.risk > 0.35 ? 0.9 : -0.55);
            }

            // Static tactical multipliers disabled by request.
            // if (!hasLlmPlan) {
            //     weight *= this.getShotSituationMultiplier(shot, chaseState, context, delivery);
            //     weight *= this.getShotObjectiveMultiplier(shot, battingObjective, context);
            // }

            weights[shot.id] = Math.max(0, weight);
        });

        const pickedShot = this._weightedRandom(shots, weights);
        this.recordPlanDecision('batting', pickedShot?.id, this.battingPlan?.preferShots || [], this.battingPlan?.avoidShots || []);
        return pickedShot;
    }

    chooseAimAngle(batter, shot, context) {
        const tendency = batter.aiTendency || {};
        let baseAngle;

        if (tendency.preferredSide === 'offside') baseAngle = 300 + Math.random() * 60;
        else if (tendency.preferredSide === 'legside') baseAngle = 120 + Math.random() * 60;
        else if (tendency.preferredSide === 'all360') baseAngle = Math.random() * 360;
        else baseAngle = Math.random() * 360;

        // Shot-specific angles override
        if (shot.id === 'drive') baseAngle = 270 + Math.random() * 90;
        if (shot.id === 'pull') baseAngle = 90 + Math.random() * 90;
        if (shot.id === 'sweep') baseAngle = 100 + Math.random() * 80;
        if (shot.id === 'cut') baseAngle = 300 + Math.random() * 50;

        return baseAngle % 360;
    }

    simulateTiming(batter, delivery, context) {
        const difficultyMult = { easy: 0.5, medium: 0.75, hard: 0.95 }[this.engine.difficulty] || 0.75;
        const attrs = this.engine.getEffectiveAttributes(batter, 'batting');
        const timingSkill = (attrs.timing || 50) / 100;

        // Higher skill = closer to center (50 = perfect)
        const targetPos = 50;
        const maxError = 50 * (1 - timingSkill * difficultyMult);
        const error = (Math.random() * 2 - 1) * maxError;

        // Harder deliveries increase error
        const deliveryPenalty = (delivery.difficulty || 0.35) * 20 * (1 - difficultyMult);

        let position = targetPos + error + (Math.random() * 2 - 1) * deliveryPenalty;
        return Math.max(0, Math.min(100, position));
    }

    // ── AI Bowling Decision ────────────────────────────────
    chooseDelivery(bowler, context) {
        this.maybeRefreshBowlingPlan(bowler, context);
        // Expect context to have: currentOver, batter (object), innings details
        const deliveries = this.bowlingSystem ? this.bowlingSystem.getAvailableDeliveries() : [];
        if (deliveries.length === 0) return null;
        const llmActive = !!(this.tacticalBrain && this.tacticalBrain.isEnabled());
        const hasLlmPlan = llmActive && !!this.bowlingPlan;
        const weights = {};

        deliveries.forEach(d => {
            let weight = 5; // base

            // Static bowling weighting disabled by request.
            // if (!hasLlmPlan) { ... }

            if (this.bowlingPlan) {
                if (this.bowlingPlan.preferDeliveries?.includes(d.id)) weight *= 1.55;
                if (this.bowlingPlan.avoidDeliveries?.includes(d.id)) weight *= 0.35;
                weight *= 1 + (this.bowlingPlan.riskBias || 0) * (d.risk > 0.22 ? 0.9 : -0.45);
            }

            // Static delivery multipliers disabled by request.
            // if (!hasLlmPlan) {
            //     weight *= this.getDeliverySituationMultiplier(d, chaseState, context, isDeathOvers);
            // }

            weights[d.id] = weight;
        });

        const pickedDelivery = this._weightedRandom(deliveries, weights);
        this.recordPlanDecision('bowling', pickedDelivery?.id, this.bowlingPlan?.preferDeliveries || [], this.bowlingPlan?.avoidDeliveries || []);
        return pickedDelivery;
    }

    chooseBowlingAim(delivery, context) {
        if (this.bowlingSystem && typeof this.bowlingSystem.getAIAimForDelivery === 'function') {
            return this.bowlingSystem.getAIAimForDelivery(delivery, this.engine.difficulty);
        }
        return { x: 50, y: 50 }; // Fallback
    }

    simulateExecution(bowler, delivery, context) {
        const difficultyMult = { easy: 0.5, medium: 0.75, hard: 0.95 }[this.engine.difficulty] || 0.75;
        const attrs = this.engine.getEffectiveAttributes(bowler, 'bowling');
        const controlSkill = (attrs.control || 50) / 100;

        const targetPos = 50;
        const maxError = 50 * (1 - controlSkill * difficultyMult);
        const error = (Math.random() * 2 - 1) * maxError;

        const difficultyPenalty = (delivery.difficulty || 0.35) * 15 * (1 - difficultyMult);

        let position = targetPos + error + (Math.random() * 2 - 1) * difficultyPenalty;
        return Math.max(0, Math.min(100, position));
    }

    // ── Utility ────────────────────────────────────────────
    _weightedRandom(items, weights) {
        const totalWeight = items.reduce((sum, item) => sum + (weights[item.id] || 1), 0);
        if (totalWeight <= 0) return items[0];
        
        let random = Math.random() * totalWeight;
        for (const item of items) {
            random -= (weights[item.id] || 1);
            if (random <= 0) return item;
        }
        return items[0];
    }

    maybeRefreshBattingPlan(batter, delivery, context) {
        if (!this.tacticalBrain || !this.tacticalBrain.isEnabled()) {
            this.logFallbackOnce();
            return;
        }
        const ballInOver = context?.ballInOver ?? ((context?.balls ?? 0) % 6);
        if (ballInOver !== 0) return;
        const balls = this.engine.state?.balls ?? 0;
        const force = this.forceReplanBatting || this.shouldForceReplan(context);
        if (this.forceReplanBatting) this.forceReplanBatting = false;
        if (!this.canRequestPlanThisOver('batting', context, force)) return;
        if (!force && balls <= this.battingPlanUntilBall) return;
        if (this.battingPlanInFlight) return;

        const bowler = this.engine.getCurrentBowler();
        const payload = this.buildSharedTacticalContext({
            context,
            batter,
            bowler,
            mode: 'batting'
        });
        payload.lastDelivery = delivery?.delivery?.id || delivery?.id || 'unknown';

        this.battingPlanInFlight = true;
        this.tacticalBrain.requestPlan('batting', payload)
            .then((plan) => {
                if (!plan) return;
                const nowBalls = this.engine.state?.balls ?? balls;
                this.battingPlan = plan;
                this.battingPlanUntilBall = nowBalls + (plan.windowBalls || 4);
                this.markPlanRequested('batting', context);
                this.emitTacticalThought('batting', plan, payload);
            })
            .finally(() => {
                this.battingPlanInFlight = false;
            });
    }

    maybeRefreshBowlingPlan(bowler, context) {
        if (!this.tacticalBrain || !this.tacticalBrain.isEnabled()) {
            this.logFallbackOnce();
            return;
        }
        const ballInOver = context?.ballInOver ?? ((context?.balls ?? 0) % 6);
        if (ballInOver !== 0) return;
        const balls = this.engine.state?.balls ?? 0;
        const force = this.forceReplanBowling || this.shouldForceReplan(context);
        if (this.forceReplanBowling) this.forceReplanBowling = false;
        if (!this.canRequestPlanThisOver('bowling', context, force)) return;
        if (!force && balls <= this.bowlingPlanUntilBall) return;
        if (this.bowlingPlanInFlight) return;

        const batter = context.batter || this.engine.getCurrentBatter();
        const payload = this.buildSharedTacticalContext({
            context,
            batter,
            bowler,
            mode: 'bowling'
        });

        this.bowlingPlanInFlight = true;
        this.tacticalBrain.requestPlan('bowling', payload)
            .then((plan) => {
                if (!plan) return;
                const nowBalls = this.engine.state?.balls ?? balls;
                this.bowlingPlan = plan;
                this.bowlingPlanUntilBall = nowBalls + (plan.windowBalls || 4);
                this.markPlanRequested('bowling', context);
                this.emitTacticalThought('bowling', plan, payload);
            })
            .finally(() => {
                this.bowlingPlanInFlight = false;
            });
    }

    shouldForceReplan(context) {
        const balls = context?.balls ?? 0;
        const ballInOver = balls % 6;
        if (ballInOver === 0 && balls > 0) return true;
        if ((context?.requiredRunRate ?? 0) >= 12 && (context?.balls ?? 0) % 3 === 0) return true;
        const totalOvers = context?.totalOvers ?? this.engine.totalOvers ?? 20;
        if ((context?.currentOver ?? 0) >= Math.max(0, totalOvers - 1) && (context?.balls ?? 0) % 2 === 0) return true;
        return false;
    }

    async ensureOverPlanReady(context, phase) {
        if (!this.tacticalBrain || !this.tacticalBrain.isEnabled()) return;
        const ballInOver = context?.ballInOver ?? ((context?.balls ?? 0) % 6);
        const atOverStart = ballInOver === 0;
        if (!atOverStart) return;

        const over = context?.currentOver ?? Math.floor((context?.balls ?? 0) / 6);
        const planType = phase === 'batting_human' ? 'bowling' : (phase === 'bowling_human' ? 'batting' : null);
        if (!planType) return;

        const key = `${planType}|inn${context?.innings}|ov${over}`;
        if (this.overPlanKey === key) return;
        if (this.overPlanPromise && this.overPlanKey === key) {
            await this.overPlanPromise;
            return;
        }

        const batter = this.engine.getCurrentBatter();
        const bowler = this.engine.getCurrentBowler();
        const payload = this.buildSharedTacticalContext({
            context,
            batter,
            bowler,
            mode: planType
        });

        this.overPlanKey = key;
        this.overPlanPromise = this.tacticalBrain.requestPlan(planType, payload)
            .then((plan) => {
                if (!plan) return;
                if (planType === 'batting') {
                    this.battingPlan = plan;
                    this.battingPlanUntilBall = (this.engine.state?.balls ?? 0) + (plan.windowBalls || 4);
                } else {
                    this.bowlingPlan = plan;
                    this.bowlingPlanUntilBall = (this.engine.state?.balls ?? 0) + (plan.windowBalls || 4);
                }
                this.markPlanRequested(planType, context);
                this.emitTacticalThought(planType, plan, payload);
            })
            .finally(() => {
                this.overPlanPromise = null;
            });

        await this.overPlanPromise;
    }

    canRequestPlanThisOver(planType, context, force) {
        const slot = this.planCadence[planType];
        const over = context?.currentOver ?? Math.floor((context?.balls ?? 0) / 6);
        if (slot.over !== over) {
            slot.over = over;
            slot.count = 0;
        }
        const maxPlans = this.maxPlansPerOver(context);
        if (slot.count < maxPlans) return true;
        // Hard cap reached for this over.
        return false;
    }

    markPlanRequested(planType, context) {
        const slot = this.planCadence[planType];
        const over = context?.currentOver ?? Math.floor((context?.balls ?? 0) / 6);
        if (slot.over !== over) {
            slot.over = over;
            slot.count = 0;
        }
        slot.count += 1;
    }

    maxPlansPerOver(context) {
        const totalOvers = context?.totalOvers ?? this.engine.totalOvers ?? 20;
        const over = context?.currentOver ?? 0;
        const isDeath = over >= Math.max(0, totalOvers - 4);
        const ballsLeft = Math.max(0, totalOvers * 6 - (context?.balls ?? 0));
        const rrr = Number(context?.requiredRunRate || 0);
        const wickets = Number(context?.wickets || 0);
        const pressure = Number(context?.pressure || 0);

        let cap = 1;
        const crux = isDeath || rrr >= 10 || wickets >= 6 || pressure >= 0.72;
        const extreme = (ballsLeft <= 12) || (rrr >= 12) || (wickets >= 8);

        if (crux) cap = 2;
        if (extreme) cap = 3;
        return cap;
    }

    buildSharedTacticalContext({ context, batter, bowler, mode }) {
        const balls = context?.balls ?? this.engine.state?.balls ?? 0;
        const totalOvers = context?.totalOvers ?? this.engine.totalOvers ?? 20;
        const ballsLeft = Math.max(0, (totalOvers * 6) - balls);
        const shortFormat = totalOvers <= 6;
        const ultraShort = totalOvers <= 2;
        const batterAttrs = this.engine.getEffectiveAttributes(batter, 'batting');
        const bowlerAttrs = this.engine.getEffectiveAttributes(bowler, 'bowling');
        const allowedShots = typeof getShotsForBatter === 'function'
            ? (getShotsForBatter(batter) || []).map((s) => s.id)
            : (typeof SHOT_TYPES !== 'undefined' ? SHOT_TYPES.map((s) => s.id) : []);
        const allowedDeliveries = this.bowlingSystem
            ? (this.bowlingSystem.getAvailableDeliveries() || []).map((d) => d.id)
            : [];

        const recentBalls = Array.isArray(this.engine.state?.lastSixBalls) ? [...this.engine.state.lastSixBalls] : [];
        const wickets = context?.wickets ?? 0;
        const runs = context?.runs ?? 0;
        const phase = context?.phase || ((context?.currentOver ?? 0) >= totalOvers - 4 ? 'death' : ((context?.currentOver ?? 0) < 6 ? 'powerplay' : 'middle'));
        const chaseState = this.getChaseState(context);
        const battingObjective = this.getBattingObjective(context, chaseState);
        const currentOver = context?.currentOver ?? Math.floor(balls / 6);
        const oversLeft = Math.max(0, totalOvers - currentOver - ((context?.ballInOver ?? (balls % 6)) > 0 ? 1 : 0));

        let tempoHint = 'standard';
        if (ultraShort) tempoHint = 'all_phases_are_clutch';
        else if (shortFormat) tempoHint = 'accelerate_early_no_long_anchor';
        else if (totalOvers <= 10) tempoHint = 'balanced_but_fast';

        return {
            mode,
            innings: context?.innings ?? this.engine.innings,
            phase,
            formatOvers: totalOvers,
            shortFormat,
            ultraShort,
            tempoHint,
            over: context?.currentOver ?? Math.floor(balls / 6),
            ballInOver: context?.ballInOver ?? (balls % 6),
            totalOvers,
            oversLeft,
            balls,
            ballsLeft,
            score: `${runs}/${wickets}`,
            runs,
            wickets,
            target: context?.target ?? this.engine.target ?? null,
            runsNeeded: context?.runsNeeded ?? null,
            wicketsInHand: Math.max(0, 10 - wickets),
            requiredRunRate: context?.requiredRunRate ?? null,
            runRate: context?.runRate ?? null,
            chaseState,
            battingObjective,
            pressure: context?.pressure ?? this.engine.calculatePressure(),
            recentBalls,
            recentOvers: Array.isArray(this.engine.state?.recentOvers) ? this.engine.state.recentOvers.slice(-2) : [],
            batter: {
                id: batter?.id || 'unknown',
                role: batter?.role || '',
                batting: batter?.batting || {},
                physical: batter?.physical || {},
                identity: batter?.identity || {},
                conversionProfile: batter?.conversionProfile || {},
                signature: batter?.signature ? {
                    name: batter.signature.name,
                    modifiers: batter.signature.modifiers || {}
                } : null,
                aiTendency: batter?.aiTendency || {},
                effective: batterAttrs || {},
                allowedShots
            },
            bowler: {
                id: bowler?.id || 'unknown',
                role: bowler?.role || '',
                bowlingStyle: bowler?.bowlingStyle || '',
                bowling: bowler?.bowling || {},
                physical: bowler?.physical || {},
                signature: bowler?.signature ? {
                    name: bowler.signature.name,
                    modifiers: bowler.signature.modifiers || {}
                } : null,
                aiTendency: bowler?.aiTendency || {},
                effective: bowlerAttrs || {},
                allowedDeliveries
            }
        };
    }

    getChaseState(context) {
        const wickets = context?.wickets ?? 0;
        const wicketsInHand = Math.max(0, 10 - wickets);
        const balls = context?.balls ?? 0;
        const totalOvers = context?.totalOvers ?? this.engine.totalOvers ?? 20;
        const ballsLeft = Math.max(0, totalOvers * 6 - balls);
        const requiredRunRate = Number(context?.requiredRunRate || 0);
        const runRate = Number(context?.runRate || 0);
        const rrGap = requiredRunRate > 0 ? requiredRunRate - runRate : 0;
        const deathPhase = (context?.currentOver ?? 0) >= Math.max(0, totalOvers - 4);

        let mode = 'balanced';
        let aggressionShift = 0;
        if (context?.innings !== 2 || !context?.target) {
            return { mode, aggressionShift, rrGap, wicketsInHand, ballsLeft, deathPhase };
        }

        if (requiredRunRate >= 11) {
            mode = wicketsInHand >= 6 ? 'all_out_attack' : 'targeted_attack';
            aggressionShift = wicketsInHand >= 6 ? 0.32 : 0.18;
        } else if (requiredRunRate >= 8.5) {
            mode = wicketsInHand >= 5 ? 'controlled_attack' : 'balanced';
            aggressionShift = wicketsInHand >= 5 ? 0.14 : 0.06;
        } else if (requiredRunRate <= 6.5) {
            mode = wicketsInHand <= 3 ? 'defensive_rotation' : 'balanced_rotation';
            aggressionShift = wicketsInHand <= 3 ? -0.18 : -0.08;
        } else {
            mode = wicketsInHand <= 3 ? 'balanced_defensive' : 'balanced';
            aggressionShift = wicketsInHand <= 3 ? -0.10 : 0;
        }

        if (deathPhase && requiredRunRate > 0) {
            if (wicketsInHand >= 5) aggressionShift += 0.08;
            if (wicketsInHand <= 2) aggressionShift -= 0.08;
        }

        return { mode, aggressionShift, rrGap, wicketsInHand, ballsLeft, deathPhase };
    }

    getBattingObjective(context, chaseState) {
        const over = context?.currentOver ?? 0;
        const totalOvers = context?.totalOvers ?? this.engine.totalOvers ?? 20;
        const wickets = context?.wickets ?? 0;
        const wicketsInHand = Math.max(0, 10 - wickets);
        const pressure = Number(context?.pressure || 0);

        if (context?.innings === 2 && context?.target) {
            return {
                phaseType: 'chase',
                mode: chaseState.mode,
                note: 'Chase target by matching or beating required rate with wicket-aware risk.'
            };
        }

        // Innings 1: set target by phases, then death acceleration if wickets in hand.
        let mode = 'platform_build';
        if (over < 6) mode = 'powerplay_launch';
        else if (over < Math.max(6, totalOvers - 4)) mode = wicketsInHand >= 6 ? 'platform_build' : 'risk_off_anchor';
        else mode = wicketsInHand >= 5 ? 'target_boost' : 'balanced_finish';
        if (pressure > 0.75 && wicketsInHand <= 3) mode = 'risk_off_anchor';

        return {
            phaseType: 'target_build',
            mode,
            note: 'Build a defendable target with phase-aware tempo and wicket preservation.'
        };
    }

    getShotSituationMultiplier(shot, chaseState, context, delivery) {
        let mult = 1;
        const deliveryId = delivery?.delivery?.id || delivery?.id || '';
        const isRisky = shot.risk > 0.4;
        const isSafe = shot.risk <= 0.18;

        if (context?.innings === 2 && context?.target) {
            if (chaseState.mode === 'all_out_attack' || chaseState.mode === 'controlled_attack') {
                if (isRisky) mult *= 1.18;
                if (isSafe) mult *= 0.80;
            }
            if (chaseState.mode === 'defensive_rotation' || chaseState.mode === 'balanced_defensive') {
                if (isRisky) mult *= 0.72;
                if (isSafe) mult *= 1.26;
            }
        }

        // Hard punish obvious bad choices in pressure chases.
        if ((chaseState.deathPhase || chaseState.rrGap > 2) && ['scoop', 'reverse_lap', 'switch_hit', 'ramp_lap'].includes(shot.id) && ['bouncer', 'slower_bouncer'].includes(deliveryId)) {
            mult *= 0.52;
        }
        if ((chaseState.deathPhase || chaseState.rrGap > 2) && ['drive', 'straight_drive'].includes(shot.id) && ['yorker', 'flipper'].includes(deliveryId)) {
            mult *= 0.62;
        }

        return this.clamp(mult, 0.35, 1.45);
    }

    getShotObjectiveMultiplier(shot, objective, context) {
        let mult = 1;
        const risky = shot.risk > 0.4;
        const safe = shot.risk <= 0.18;

        if (context?.innings === 1) {
            if (objective.mode === 'powerplay_launch') {
                if (risky) mult *= 1.10;
                if (safe) mult *= 0.92;
            } else if (objective.mode === 'platform_build' || objective.mode === 'risk_off_anchor') {
                if (safe) mult *= 1.16;
                if (risky) mult *= objective.mode === 'risk_off_anchor' ? 0.62 : 0.78;
            } else if (objective.mode === 'target_boost' || objective.mode === 'balanced_finish') {
                if (risky) mult *= objective.mode === 'target_boost' ? 1.20 : 1.08;
                if (safe) mult *= 0.85;
            }
        }

        return this.clamp(mult, 0.4, 1.5);
    }

    getDeliverySituationMultiplier(delivery, chaseState, context, isDeathOvers) {
        let mult = 1;
        const d = delivery.id;

        if (context?.innings === 2 && context?.target) {
            if (chaseState.mode === 'all_out_attack' || chaseState.mode === 'controlled_attack') {
                if (['yorker', 'off_cutter', 'knuckle_ball', 'slower_ball', 'flipper', 'slider'].includes(d)) mult *= 1.22;
                if (['full_length', 'flighted'].includes(d)) mult *= 0.78;
            }
            if (chaseState.mode === 'defensive_rotation' || chaseState.mode === 'balanced_defensive') {
                if (['good_length', 'outswing', 'inswing', 'stock', 'top_spinner', 'arm_ball'].includes(d)) mult *= 1.14;
                if (['bouncer', 'slower_bouncer'].includes(d)) mult *= 0.86;
            }
        }

        if (isDeathOvers) {
            if (['yorker', 'off_cutter', 'knuckle_ball', 'slower_ball', 'flipper'].includes(d)) mult *= 1.16;
            if (['full_length', 'flighted'].includes(d)) mult *= 0.72;
        }

        return this.clamp(mult, 0.35, 1.55);
    }

    clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    logFallbackOnce() {
        if (this.loggedFallbackOnce) return;
        this.loggedFallbackOnce = true;
        try {
            console.info('[AIController] Tactical fallback active (LLM disabled or unavailable).');
        } catch (_err) {
            // no-op
        }
    }

    emitTacticalThought(planType, plan, payload) {
        if (typeof this.onTacticalThought !== 'function') return;

        const text = this.composeHumanTacticalThought(planType, plan, payload);
        const signature = `${planType}|${plan?.intent || ''}|${plan?.read || ''}|${plan?.narrative || ''}`;
        const now = Date.now();
        if (signature === this.lastThoughtSignature && (now - this.lastThoughtAt) < this.thoughtMinIntervalMs) return;
        if ((now - this.lastThoughtAt) < this.thoughtMinIntervalMs) return;
        this.lastThoughtSignature = signature;
        this.lastThoughtAt = now;
        this.onTacticalThought({
            type: planType,
            text,
            urgent: false
        });
    }

    composeHumanTacticalThought(planType, plan, payload) {
        const read = this.normalizeThoughtSentence(plan?.read || '');
        const narrative = this.normalizeThoughtSentence(plan?.narrative || '');
        const opening = planType === 'batting' ? 'Batting brain:' : 'Bowling brain:';
        const intent = this.planTokenToText(plan?.intent || '');
        const fallback = this.buildFallbackThought(planType, plan, payload, intent);

        let body = '';
        if (read && narrative) body = `${read} ${narrative}`;
        else if (read) body = read;
        else if (narrative) body = narrative;
        else body = fallback;

        return `${opening} ${body}`.replace(/\s+/g, ' ').trim();
    }

    normalizeThoughtSentence(text) {
        if (typeof text !== 'string') return '';
        return text
            .replace(/^["'\s]+|["'\s]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    buildFallbackThought(planType, plan, payload, intent) {
        const mode = planType === 'batting'
            ? (payload?.battingObjective?.mode ? String(payload.battingObjective.mode).replace(/_/g, ' ') : 'balanced')
            : (payload?.chaseState?.mode ? String(payload.chaseState.mode).replace(/_/g, ' ') : 'balanced');

        if (planType === 'batting') {
            if (payload?.innings === 2 && Number.isFinite(payload?.requiredRunRate)) {
                return `This chase is alive and I know exactly what it needs. ${intent ? `I'm leaning ${intent}. ` : ''}I want to stay ahead of the rate, not chase it late.`;
            }
            return `I can feel the shape of this innings now. ${intent ? `I'm leaning ${intent}. ` : ''}The aim is to build a target that puts real pressure back on them.`;
        }

        if (payload?.innings === 2 && Number.isFinite(payload?.requiredRunRate)) {
            return `I have the chase in my hands if I stay sharp here. ${intent ? `I'm leaning ${intent}. ` : ''}One tight over and this game starts bending my way.`;
        }
        return `I want this batter making the next mistake, not me. ${intent ? `I'm leaning ${intent}. ` : ''}Keep the pressure on and make them feel every ball.`;
    }

    planTokenToText(v) {
        if (typeof v === 'string') return v.replace(/_/g, ' ').trim();
        if (v && typeof v === 'object') {
            const raw = v.id || v.name || v.value || '';
            if (typeof raw === 'string') return raw.replace(/_/g, ' ').trim();
        }
        return '';
    }

    recordPlanDecision(planType, pickedId, preferredList, avoidList) {
        if (!pickedId || !this.planStats[planType]) return;
        const stats = this.planStats[planType];
        stats.total += 1;
        if (Array.isArray(preferredList) && preferredList.length > 0 && preferredList.includes(pickedId)) {
            stats.preferredHits += 1;
        }
        if (Array.isArray(avoidList) && avoidList.length > 0 && avoidList.includes(pickedId)) {
            stats.avoidBreaches += 1;
        }
    }

    onBallResolved(outcome, context, meta = {}) {
        if (!outcome) return;

        if (outcome.wicket) {
            this.forceReplanBatting = true;
            this.forceReplanBowling = true;
            this.battingPlanUntilBall = -1;
            this.bowlingPlanUntilBall = -1;
            return;
        }

        if (outcome.six || outcome.boundary) {
            this.forceReplanBatting = true;
            this.forceReplanBowling = true;
            this.battingPlanUntilBall = -1;
            this.bowlingPlanUntilBall = -1;
        }
    }

    emitReactiveThought(planType, message, urgent) {
        if (typeof this.onTacticalThought !== 'function') return;
        const now = Date.now();
        const min = urgent ? 6000 : 12000;
        if ((now - this.lastThoughtAt) < min) return;
        this.lastThoughtAt = now;
        this.lastThoughtSignature = `reactive|${planType}|${message}`;
        this.onTacticalThought({
            type: planType,
            text: `${planType === 'batting' ? 'Batting brain:' : 'Bowling brain:'} ${message}`,
            urgent: !!urgent
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIController };
}
