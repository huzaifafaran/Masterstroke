// ============================================================
// CRICKET LEGENDS — Core Match Engine
// ============================================================

class MatchEngine {
    constructor(config) {
        this.team1 = config.team1;  // array of player objects
        this.team2 = config.team2;
        this.totalOvers = config.totalOvers || 20;
        this.pitch = config.pitch || PITCH_TYPES[0];
        this.difficulty = config.difficulty || 'medium';

        this.innings = 1;
        this.battingTeam = this.team1;
        this.bowlingTeam = this.team2;
        this.target = null;

        this.state = this.createInningsState();
        this.matchLog = [];
        this.events = {};
        this.isMatchOver = false;
        this.tossWinner = null;
        this.tossChoice = null;
        this.customBattingOrder = {
            team1: Array.isArray(config.team1BattingOrder) ? [...config.team1BattingOrder] : null,
            team2: Array.isArray(config.team2BattingOrder) ? [...config.team2BattingOrder] : null
        };
        this.customBowlingRotation = {
            team1: Array.isArray(config.team1BowlingRotation) ? [...config.team1BowlingRotation] : null,
            team2: Array.isArray(config.team2BowlingRotation) ? [...config.team2BowlingRotation] : null
        };
        
        // Mode support
        this.mode = null;
        this.duelBalls = 0;
    }

    getTeamKey(teamRef) {
        if (teamRef === this.team1) return 'team1';
        if (teamRef === this.team2) return 'team2';
        return null;
    }

    applyIdOrder(players, orderIds = null) {
        if (!Array.isArray(players) || players.length === 0) return [];
        if (!Array.isArray(orderIds) || orderIds.length === 0) return [...players];

        const byId = new Map(players.map((p) => [p.id, p]));
        const ordered = [];
        const seen = new Set();

        orderIds.forEach((id) => {
            const player = byId.get(id);
            if (player && !seen.has(id)) {
                ordered.push(player);
                seen.add(id);
            }
        });

        players.forEach((player) => {
            if (!seen.has(player.id)) ordered.push(player);
        });

        return ordered;
    }

    forceMode(mode) {
        this.mode = mode;
    }

    getModeContext() {
        return { mode: this.mode };
    }

    swapTeams() {
        const temp = this.battingTeam;
        this.battingTeam = this.bowlingTeam;
        this.bowlingTeam = temp;
    }

    startInnings() {
        this.state = this.createInningsState();
        this.init();
    }

    setTargetIfNeeded(score) {
        this.target = score;
    }

    resetForDuel(batter, bowler, balls) {
        this.forceMode('duel');
        this.duelBalls = balls;
        this.totalOvers = Math.ceil(balls / 6);
        
        this.battingTeam = [batter];
        this.bowlingTeam = [bowler];
        
        this.state = this.createInningsState();
        this.state.battingOrder = [batter];
        this.state.bowlerRotation = [bowler];
        
        this.state.batsmenStats[batter.id] = {
            runs: 0, balls: 0, fours: 0, sixes: 0,
            dotBalls: 0, strikeRate: 0, isOut: false,
            dismissal: null, shotHistory: []
        };
        this.state.bowlerStats[bowler.id] = {
            overs: 0, balls: 0, runs: 0, wickets: 0,
            maidens: 0, economy: 0, dots: 0, currentOverRuns: 0,
            stamina: 100, deliveries: []
        };
        
        this.state.currentBatterIndex = 0;
        this.state.nonStrikerIndex = 0;
        this.state.currentBowlerIndex = 0;
        
        return this;
    }


    createInningsState() {
        return {
            runs: 0,
            wickets: 0,
            balls: 0,
            extras: 0,
            currentOver: 0,
            ballInOver: 0,
            currentBatterIndex: 0,
            nonStrikerIndex: 1,
            currentBowlerIndex: 0,
            nextBowlerIndex: 1,
            battingOrder: [],
            bowlerRotation: [],
            batsmenStats: {},
            bowlerStats: {},
            partnerships: [],
            currentPartnership: { runs: 0, balls: 0 },
            consecutiveBoundaries: 0,
            consecutiveDots: 0,
            lastSixBalls: [],
            recentOvers: [],
            fallOfWickets: [],
            wagonWheel: [],
            commentary: [],
            helicopterUsed: false,
            overHistory: []
        };
    }

    init() {
        // Set batting order (supports pre-match custom lineup).
        const battingTeamKey = this.getTeamKey(this.battingTeam);
        const battingOrderIds = battingTeamKey ? this.customBattingOrder[battingTeamKey] : null;
        this.state.battingOrder = this.applyIdOrder(this.battingTeam, battingOrderIds);

        // Build bowling candidates and then apply optional custom bowling rotation.
        const bowlingCandidates = this.bowlingTeam.filter(p =>
            p.role === PLAYER_ROLES.BOWLER || p.role === PLAYER_ROLES.ALL_ROUNDER
        );
        const bowlingTeamKey = this.getTeamKey(this.bowlingTeam);
        const bowlingOrderIds = bowlingTeamKey ? this.customBowlingRotation[bowlingTeamKey] : null;
        this.state.bowlerRotation = this.applyIdOrder(bowlingCandidates, bowlingOrderIds);

        if (this.state.bowlerRotation.length < 5) {
            // Add part-timers if needed
            const extras = this.bowlingTeam.filter(p =>
                !this.state.bowlerRotation.includes(p) &&
                p.bowling.paceOrSpin > 30
            );
            this.state.bowlerRotation.push(...extras);
        }

        // Init batsmen stats
        this.battingTeam.forEach(p => {
            this.state.batsmenStats[p.id] = {
                runs: 0, balls: 0, fours: 0, sixes: 0,
                dotBalls: 0, strikeRate: 0, isOut: false,
                dismissal: null, shotHistory: []
            };
        });

        // Init bowler stats
        this.state.bowlerRotation.forEach(p => {
            this.state.bowlerStats[p.id] = {
                overs: 0, balls: 0, runs: 0, wickets: 0,
                maidens: 0, economy: 0, dots: 0, currentOverRuns: 0,
                stamina: 100, deliveries: []
            };
        });

        this.state.currentBatterIndex = 0;
        this.state.nonStrikerIndex = 1;

        return this;
    }

    // ── Event System ───────────────────────────────────────
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(cb => cb(data));
        }
    }

    // ── Getters ────────────────────────────────────────────
    getCurrentBatter() {
        return this.state.battingOrder[this.state.currentBatterIndex];
    }

    getNonStriker() {
        return this.state.battingOrder[this.state.nonStrikerIndex];
    }

    getCurrentBowler() {
        return this.state.bowlerRotation[this.state.currentBowlerIndex];
    }

    getBatterStats(playerId) {
        return this.state.batsmenStats[playerId];
    }

    getBowlerStats(playerId) {
        return this.state.bowlerStats[playerId];
    }

    getRunRate() {
        if (this.state.balls === 0) return 0;
        return (this.state.runs / (this.state.balls / 6)).toFixed(2);
    }

    getRequiredRunRate() {
        if (!this.target || this.innings !== 2) return 0;
        const ballsLeft = (this.totalOvers * 6) - this.state.balls;
        if (ballsLeft <= 0) return 999;
        const runsNeeded = this.target - this.state.runs;
        return ((runsNeeded / ballsLeft) * 6).toFixed(2);
    }

    getMatchContext() {
        const pressure = this.calculatePressure();
        const phase = this.getMatchPhase();
        const currentBatter = this.getCurrentBatter();
        const batterStats = currentBatter ? this.getBatterStats(currentBatter.id) : null;

        return {
            innings: this.innings,
            runs: this.state.runs,
            wickets: this.state.wickets,
            balls: this.state.balls,
            currentOver: Math.floor(this.state.balls / 6),
            ballInOver: this.state.balls % 6,
            target: this.target,
            runsNeeded: this.target ? this.target - this.state.runs : null,
            requiredRunRate: parseFloat(this.getRequiredRunRate()),
            runRate: parseFloat(this.getRunRate()),
            totalOvers: this.totalOvers,
            consecutiveBoundaries: this.state.consecutiveBoundaries,
            consecutiveDots: this.state.consecutiveDots,
            currentBatterRuns: batterStats ? batterStats.runs : 0,
            currentBatterBalls: batterStats ? batterStats.balls : 0,
            wicketsNeeded: this.innings === 2 ? 10 - this.state.wickets : null,
            runsRemaining: this.target ? this.target - this.state.runs : null,
            helicopterUsed: this.state.helicopterUsed,
            pitch: this.pitch,
            pressure: pressure,
            phase: phase,
            fieldDensity: this.getFieldDensityModel(null, null, phase, pressure)
        };
    }

    // ── Pressure Calculation ───────────────────────────────
    calculatePressure() {
        let pressure = 0;

        // Wickets lost pressure
        pressure += this.state.wickets * 0.08;

        // Run rate pressure (chasing)
        if (this.innings === 2 && this.target) {
            const rrr = parseFloat(this.getRequiredRunRate());
            if (rrr > 10) pressure += 0.3;
            else if (rrr > 8) pressure += 0.2;
            else if (rrr > 6) pressure += 0.1;

            // Close match pressure
            const runsNeeded = this.target - this.state.runs;
            const ballsLeft = (this.totalOvers * 6) - this.state.balls;
            if (runsNeeded <= 20 && ballsLeft <= 12) pressure += 0.25;
        }

        // Dot ball pressure
        if (this.state.consecutiveDots >= 4) {
            pressure += 0.1 * Math.min(this.state.consecutiveDots - 3, 4);
        }

        // Death overs pressure
        if (Math.floor(this.state.balls / 6) >= this.totalOvers - 4) {
            pressure += 0.1;
        }

        return Math.min(pressure, 1.0);
    }

    getMatchPhase() {
        const over = Math.floor(this.state.balls / 6);
        if (over < 6) return 'powerplay';
        if (over < Math.max(6, this.totalOvers - 4)) return 'middle';
        return 'death';
    }

    getFieldDensityModel(angle = null, shotCategory = null, phase = null, pressure = null) {
        const presetTable = (typeof FIELD_DENSITY_PRESETS !== 'undefined') ? FIELD_DENSITY_PRESETS : null;
        const basePreset = presetTable ? (presetTable[this.difficulty] || presetTable.medium) : null;
        const density = basePreset ? { ...basePreset } : {
            straight: 0.34,
            offside: 0.60,
            legside: 0.54,
            deep: 0.42,
            innerRing: 0.70
        };

        const p = pressure !== null ? pressure : this.calculatePressure();
        const matchPhase = phase || this.getMatchPhase();

        if (matchPhase === 'powerplay') density.deep = Math.max(0.22, density.deep - 0.08);
        if (matchPhase === 'death') {
            density.deep = Math.min(0.90, density.deep + 0.12);
            density.innerRing = Math.max(0.35, density.innerRing - 0.06);
        }

        // High-pressure moments tighten ring fielding and increase mis-hit punishments.
        density.innerRing = Math.min(0.95, density.innerRing + p * 0.08);

        if (shotCategory === 'power' || shotCategory === 'innovative') {
            density.deep = Math.min(0.95, density.deep + 0.06);
        }

        if (typeof angle === 'number') {
            const norm = ((angle % 360) + 360) % 360;
            if ((norm >= 250 && norm <= 340) || (norm >= 20 && norm <= 70)) {
                density.offside = Math.min(0.95, density.offside + 0.03);
            } else if (norm >= 90 && norm <= 220) {
                density.legside = Math.min(0.95, density.legside + 0.03);
            } else {
                density.straight = Math.min(0.95, density.straight + 0.03);
            }
        }

        return density;
    }

    // ── Attribute Calculator ───────────────────────────────
    getEffectiveAttributes(player, role = 'batting') {
        const context = this.getMatchContext();
        const attrs = role === 'batting' ? { ...player.batting } : { ...player.bowling };
        const physical = { ...player.physical };

        // Apply consistency variance
        const consistencyFactor = physical.consistency / 100;
        Object.keys(attrs).forEach(key => {
            const base = attrs[key];
            const variance = (1 - consistencyFactor) * 15;
            attrs[key] = Math.round(base + (Math.random() * 2 - 1) * variance);
            attrs[key] = Math.max(0, Math.min(100, attrs[key]));
        });

        // Apply signature ability
        if (player.signature && player.signature.condition(context)) {
            const mods = player.signature.modifiers;

            if (role === 'batting') {
                if (mods.timingMult) attrs.timing = Math.round(attrs.timing * mods.timingMult);
                if (mods.timingAdd) attrs.timing = Math.min(100, attrs.timing + mods.timingAdd);
                if (mods.composureAdd) attrs.composure = Math.min(100, attrs.composure + mods.composureAdd);
                if (mods.shotPlacementAdd) attrs.shotPlacement = Math.min(100, attrs.shotPlacement + mods.shotPlacementAdd);
                if (mods.powerAdd) attrs.power = Math.min(100, attrs.power + mods.powerAdd);
                if (mods.footworkAdd) attrs.footwork = Math.min(100, attrs.footwork + mods.footworkAdd);
                if (mods.contextualBoost) {
                    attrs.timing = Math.min(100, attrs.timing + mods.contextualBoost);
                    attrs.shotPlacement = Math.min(100, attrs.shotPlacement + mods.contextualBoost);
                    attrs.composure = Math.min(100, attrs.composure + mods.contextualBoost);
                }
                if (mods.consistencyFloor) physical.consistency = Math.max(physical.consistency, mods.consistencyFloor);
                if (mods.timingAddOnHardPitch && (this.pitch.id === 'pace' || this.pitch.id === 'worn')) {
                    attrs.timing = Math.min(100, attrs.timing + mods.timingAddOnHardPitch);
                }
            }

            if (role === 'bowling') {
                if (mods.paceAdd) attrs.paceOrSpin = Math.min(100, attrs.paceOrSpin + mods.paceAdd);
                if (mods.swingAdd) attrs.swingOrTurn = Math.min(100, attrs.swingOrTurn + mods.swingAdd);
                if (mods.turnAdd) attrs.swingOrTurn = Math.min(100, attrs.swingOrTurn + mods.turnAdd);
                if (mods.yorkerAccuracyAdd) attrs.accuracy = Math.min(100, attrs.accuracy + mods.yorkerAccuracyAdd);
                if (mods.googlyAccuracyAdd) attrs.accuracy = Math.min(100, attrs.accuracy + mods.googlyAccuracyAdd);
                if (mods.contextualBoost) {
                    attrs.accuracy = Math.min(100, attrs.accuracy + mods.contextualBoost);
                    attrs.swingOrTurn = Math.min(100, attrs.swingOrTurn + mods.contextualBoost);
                    attrs.control = Math.min(100, attrs.control + mods.contextualBoost);
                }
            }

            // Attribute floor (Kallis)
            if (mods.attributeFloor) {
                Object.keys(attrs).forEach(key => {
                    attrs[key] = Math.max(attrs[key], mods.attributeFloor);
                });
            }
        }

        // Apply pressure penalties (batting)
        if (role === 'batting') {
            const pressure = this.calculatePressure();
            const composureFactor = (attrs.composure || 50) / 100;
            const currentBowler = this.getCurrentBowler();

            // Steyn intimidation-style effects or any bowler-driven composure modifiers.
            if (currentBowler?.signature?.modifiers?.batterComposurePenalty &&
                currentBowler.signature.condition(context)) {
                attrs.composure = Math.max(0, Math.min(100, attrs.composure + currentBowler.signature.modifiers.batterComposurePenalty));
            }

            // Dhoni pressure immunity
            if (player.signature?.modifiers?.pressureImmunity) {
                // No pressure penalty
            } else {
                const penalty = pressure * 0.3 * (1 - composureFactor);
                attrs.timing = Math.round(attrs.timing * (1 - penalty));
                attrs.shotPlacement = Math.round(attrs.shotPlacement - pressure * 10 * (1 - composureFactor));
            }
        }

        // Apply pitch modifiers (bowling)
        if (role === 'bowling') {
            if (isPaceBowler(player)) {
                attrs.swingOrTurn = Math.round(attrs.swingOrTurn * this.pitch.paceMod);
            } else {
                attrs.swingOrTurn = Math.round(attrs.swingOrTurn * this.pitch.spinMod);
            }
        }

        Object.keys(attrs).forEach((key) => {
            attrs[key] = Math.max(0, Math.min(100, attrs[key]));
        });

        return { ...attrs, ...physical };
    }

    // ── Timing Window Calculator ───────────────────────────
    getTimingWindow(batter) {
        const attrs = this.getEffectiveAttributes(batter, 'batting');
        const scale = { easy: 1.3, medium: 1.0, hard: 0.7 }[this.difficulty] || 1.0;

        let perfectWindow = (40 + (attrs.timing || 50) * 0.6) * scale;
        perfectWindow *= this.pitch.timingMod;
        perfectWindow = Math.max(20, Math.min(150, perfectWindow));

        return {
            total: 200 * scale,
            perfect: perfectWindow,
            early: (200 * scale - perfectWindow) / 2,
            late: (200 * scale - perfectWindow) / 2
        };
    }

    // ── Process Ball ───────────────────────────────────────
    processBall(ballResult) {
        const { runs, wicket, boundary, six, edge, timing, shotType, deliveryType, extras } = ballResult;
        const batter = this.getCurrentBatter();
        const bowler = this.getCurrentBowler();
        const batterStats = this.getBatterStats(batter.id);
        const bowlerStats = this.getBowlerStats(bowler.id);

        this.state.runs += runs + (extras || 0);
        this.state.balls++;
        this.state.ballInOver = this.state.balls % 6;
        this.state.currentOver = Math.floor(this.state.balls / 6);

        if (batterStats) {
            batterStats.balls++;
            batterStats.runs += runs;
            if (runs === 4 || boundary) batterStats.fours++;
            if (runs === 6 || six) batterStats.sixes++;
            if (runs === 0 && !extras) batterStats.dotBalls++;
            batterStats.strikeRate = ((batterStats.runs / Math.max(1, batterStats.balls)) * 100).toFixed(1);
            batterStats.shotHistory.push({ run: runs, timing, shotType, deliveryType });
        }

        if (bowlerStats) {
            bowlerStats.balls++;
            bowlerStats.runs += runs + (extras || 0);
            if (runs === 0 && !extras) bowlerStats.dots++;
            bowlerStats.currentOverRuns += runs + (extras || 0);
            bowlerStats.overs = Math.floor(bowlerStats.balls / 6) + (bowlerStats.balls % 6) / 10;
            bowlerStats.economy = bowlerStats.balls > 0 ? ((bowlerStats.runs / (bowlerStats.balls / 6))).toFixed(1) : '0.0';
        }

        if (runs >= 4) {
            this.state.consecutiveBoundaries++;
            this.state.consecutiveDots = 0;
        } else if (runs === 0) {
            this.state.consecutiveDots++;
            this.state.consecutiveBoundaries = 0;
        } else {
            this.state.consecutiveBoundaries = 0;
            this.state.consecutiveDots = 0;
        }

        this.state.lastSixBalls.push(runs);
        if (this.state.lastSixBalls.length > 6) this.state.lastSixBalls.shift();

        this.state.currentPartnership.runs += runs;
        this.state.currentPartnership.balls++;

        if (runs > 0) {
            this.state.wagonWheel.push({ runs, angle: ballResult.angle || 0, distance: ballResult.distance || 0 });
        }

        if (wicket) {
            this.state.wickets++;
            if (batterStats) {
                batterStats.isOut = true;
                batterStats.dismissal = ballResult.dismissal || 'out';
            }
            if (bowlerStats) bowlerStats.wickets++;
            
            this.state.fallOfWickets.push({
                wicket: this.state.wickets,
                runs: this.state.runs,
                overs: `${this.state.currentOver}.${this.state.balls % 6}`,
                batter: batter.name,
                batterRuns: batterStats ? batterStats.runs : 0
            });

            this.state.partnerships.push({ ...this.state.currentPartnership });
            this.state.currentPartnership = { runs: 0, balls: 0 };
            this.state.consecutiveBoundaries = 0;

            const nextIndex = this.state.wickets + 1;
            if (nextIndex < this.state.battingOrder.length) {
                this.state.currentBatterIndex = nextIndex;
            }

            this.emit('wicket', { batter, bowler, dismissal: batterStats?.dismissal, score: this.state.runs, wickets: this.state.wickets });
        }

        if (runs % 2 === 1) this.rotateStrike();

        if (this.state.balls % 6 === 0 && this.state.balls > 0) {
            if (bowlerStats && bowlerStats.currentOverRuns === 0) bowlerStats.maidens++;
            if (bowlerStats) bowlerStats.currentOverRuns = 0;

            this.state.recentOvers.push({
                bowler: bowler.name,
                runs: this.state.lastSixBalls.reduce((a, b) => a + b, 0),
                balls: [...this.state.lastSixBalls]
            });

            this.rotateStrike();
            this.rotateBowler();
            this.drainBowlerStamina(bowler);

            this.emit('overEnd', {
                over: this.state.currentOver,
                bowler: bowler.name,
                overRuns: this.state.recentOvers[this.state.recentOvers.length - 1]?.runs || 0,
                score: `${this.state.runs}/${this.state.wickets}`
            });
        }

        this.emit('ballComplete', {
            ...ballResult,
            batter: batter.name,
            bowler: bowler.name,
            score: `${this.state.runs}/${this.state.wickets}`,
            overs: `${Math.floor(this.state.balls / 6)}.${this.state.balls % 6}`
        });

        if (this.isInningsOver()) {
            this.endInnings();
        }

        return this.state;
    }

    rotateStrike() {
        const temp = this.state.currentBatterIndex;
        this.state.currentBatterIndex = this.state.nonStrikerIndex;
        this.state.nonStrikerIndex = temp;
    }

    rotateBowler() {
        if (!this.state.bowlerRotation || this.state.bowlerRotation.length <= 1) return;
        const prev = this.state.currentBowlerIndex;
        this.state.currentBowlerIndex = this.state.nextBowlerIndex;

        let next = (this.state.currentBowlerIndex + 1) % this.state.bowlerRotation.length;
        if (next === prev && this.state.bowlerRotation.length > 2) {
            next = (next + 1) % this.state.bowlerRotation.length;
        }
        this.state.nextBowlerIndex = next;
    }

    drainBowlerStamina(bowler) {
        const stats = this.getBowlerStats(bowler.id);
        if (stats) {
            let drain = 100 / ((bowler.physical?.stamina || 50) * 0.15);
            if (bowler.signature?.modifiers?.staminaDrainMult) {
                drain *= bowler.signature.modifiers.staminaDrainMult;
            }
            stats.stamina = Math.max(0, stats.stamina - drain);
        }
    }

    isInningsOver() {
        if (this.state.wickets >= (this.mode === 'duel' ? 1 : 10)) return true;
        if (this.state.balls >= this.totalOvers * 6) return true;
        
        // Edge case: if duel mode allows exactly `this.duelBalls` which may not be a full over
        if (this.mode === 'duel' && this.state.balls >= this.duelBalls) return true;
        
        if (this.innings === 2 && this.target && this.state.runs >= this.target) return true;
        return false;
    }

    endInnings() {
        if (this.state.currentPartnership.balls > 0) {
            this.state.partnerships.push({ ...this.state.currentPartnership });
        }

        this.emit('inningsEnd', {
            innings: this.innings,
            total: this.state.runs,
            wickets: this.state.wickets,
            overs: `${Math.floor(this.state.balls / 6)}.${this.state.balls % 6}`
        });

        if (this.innings === 1) {
            this.firstInningsState = { ...this.state };
            this.firstInningsState.batsmenStats = { ...this.state.batsmenStats };
            this.firstInningsState.bowlerStats = { ...this.state.bowlerStats };
            this.setTargetIfNeeded(this.state.runs + 1);

            if (this.mode === 'vs_ai' || this.mode === 'duel') {
                return; // ModeController handles transition
            }

            this.innings = 2;
            this.swapTeams();
            this.startInnings();
        } else {
            this.isMatchOver = true;
            if (!this.mode) {
                this.emit('matchEnd', this.getMatchResult());
            }
        }
    }

    getMatchResult() {
        const firstInnings = this.firstInningsState;
        const secondInnings = this.state;

        let result = {};
        if (secondInnings.runs >= this.target) {
            const wicketsLeft = 10 - secondInnings.wickets;
            result = {
                winner: this.battingTeam === this.team1 ? 'Team 1' : 'Team 2',
                margin: `${wicketsLeft} wickets`,
                method: 'wickets'
            };
        } else if (secondInnings.runs === this.target - 1) {
            result = { winner: 'Tie', margin: 'Match tied!', method: 'tie' };
        } else {
            const runMargin = (this.target - 1) - secondInnings.runs;
            result = {
                winner: this.bowlingTeam === this.team1 ? 'Team 1' : 'Team 2',
                margin: `${runMargin} runs`,
                method: 'runs'
            };
        }

        result.firstInnings = firstInnings;
        result.secondInnings = secondInnings;
        result.target = this.target;
        return result;
    }

    // ── Simulate Toss ──────────────────────────────────────
    simulateToss() {
        this.tossWinner = Math.random() > 0.5 ? 'team1' : 'team2';
        this.tossChoice = Math.random() > 0.5 ? 'bat' : 'bowl';

        if ((this.tossWinner === 'team2' && this.tossChoice === 'bat') ||
            (this.tossWinner === 'team1' && this.tossChoice === 'bowl')) {
            // Swap batting order
            const temp = this.battingTeam;
            this.battingTeam = this.bowlingTeam;
            this.bowlingTeam = temp;
            this.state = this.createInningsState();
            this.init();
        }

        return { winner: this.tossWinner, choice: this.tossChoice };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MatchEngine };
}
