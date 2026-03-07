// ============================================================
// CRICKET LEGENDS — Core Game Controller
// ============================================================

class GameController {
    constructor(engine, battingSystem, bowlingSystem, commentarySystem) {
        this.engine = engine;
        this.batting = battingSystem;
        this.bowling = bowlingSystem;
        this.commentary = commentarySystem;
        
        // Ensure AI is fully injected with the systems
        this.ai = new AIController(engine, battingSystem, bowlingSystem);

        this.currentModeCtrl = null;
        this.currentMode = null; // 'duel' or 'vs_ai'
        
        // phases: 'toss_decision', 'batting_human', 'bowling_human', 'matchEnd'
        this.phase = null; 
        
        this.events = {};
        
        // Track the current delivery setup for the ball
        this.pendingDelivery = null; 
    }

    // ── External API for Menus/UI ──────────────────────────
    startDuel(config) {
        this.currentMode = 'duel';
        this.currentModeCtrl = new DuelModeController(this, this.engine);
        this.currentModeCtrl.start(config);
    }

    startVsAI(config) {
        this.currentMode = 'vs_ai';
        // Ensure innings transitions are owned by the VS-AI mode controller.
        this.engine.forceMode('vs_ai');
        this.currentModeCtrl = new VsAIModeController(this, this.engine);
        this.currentModeCtrl.start(config);
    }

    getCurrentMode() {
        return this.currentMode;
    }

    getGameState() {
        return {
            mode: this.currentMode,
            phase: this.phase,
            engineState: this.engine.state,
            humanRole: this.currentModeCtrl?.humanRole || 'bat',
            toss: {
                winner: this.engine.tossWinner,
                choice: this.engine.tossChoice
            }
        };
    }

    setPhase(phase) {
        this.phase = phase;
        this.emit('phaseChange', { phase });
    }

    // ── Event System ────────────────────────────────────────
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(cb => cb(data));
        }
    }

    // ── Core Gameplay Loop ──────────────────────────────────
    async prepareNextBall() {
        if (this.engine.isMatchOver || this.engine.isInningsOver()) return;

        this.pendingDelivery = null;
        const context = this.engine.getMatchContext();
        const batter = this.engine.getCurrentBatter();
        const bowler = this.engine.getCurrentBowler();

        if (this.ai && typeof this.ai.ensureOverPlanReady === 'function') {
            await this.ai.ensureOverPlanReady(context, this.phase);
        }

        if (this.phase === 'batting_human') {
            // AI Bowls
            const aiDeliveryChoice = this.ai.chooseDelivery(bowler, context);
            const aim = this.ai.chooseBowlingAim(aiDeliveryChoice, context);
            const execQuality = this.ai.simulateExecution(bowler, aiDeliveryChoice, context);

            this.bowling.setAim(aim.x, aim.y);
            this.bowling.selectDelivery(aiDeliveryChoice.id);
            this.bowling.executionPosition = execQuality;

            const deliveryResult = this.bowling.calculateDeliveryProperties(
                aiDeliveryChoice,
                this.engine.getEffectiveAttributes(bowler, 'bowling'),
                1 - Math.abs(execQuality - 50) / 50,
                0, aim.x, aim.y, bowler, context
            );

            this.pendingDelivery = deliveryResult;
            this.emit('ballReadyHumanBatting', { deliveryResult, batter, bowler });

        } else if (this.phase === 'bowling_human') {
            // Wait for human to bowl. UI will call handlePlayerDelivery.
            this.emit('ballReadyHumanBowling', { batter, bowler });
        }
    }

    // UI calls this when human plays a shot (batting_human phase)
    handlePlayerShot(shotId, aimAngle, timingPosition) {
        if (!this.pendingDelivery || this.phase !== 'batting_human') return null;

        this.batting.currentDelivery = this.pendingDelivery;
        this.batting.timingBarPosition = timingPosition;
        this.batting.timingBarActive = true; 

        const outcome = this.batting.executeShot(shotId, aimAngle);
        return this._resolveBallOutcome(outcome);
    }

    // UI calls this when human bowls a ball (bowling_human phase)
    handlePlayerDelivery(deliveryId, aimX, aimY, executionPosition) {
        if (this.phase !== 'bowling_human') return null;

        const bowler = this.engine.getCurrentBowler();
        const batter = this.engine.getCurrentBatter();
        const context = this.engine.getMatchContext();
        
        const deliveryType = this.bowling.getAvailableDeliveries().find(d => d.id === deliveryId) || this.bowling.getAvailableDeliveries()[0];

        this.bowling.setAim(aimX, aimY);
        this.bowling.selectDelivery(deliveryType.id);
        this.bowling.executionPosition = executionPosition;

        const deliveryResult = this.bowling.calculateDeliveryProperties(
            deliveryType,
            this.engine.getEffectiveAttributes(bowler, 'bowling'),
            1 - Math.abs(executionPosition - 50) / 50,
            0, aimX, aimY, bowler, context
        );

        // AI Bats
        const canRead = this.bowling.canBatterRead(deliveryResult, batter);
        const aiShotChoice = this.ai.chooseShot(batter, deliveryResult, context);
        let aimAngle = this.ai.chooseAimAngle(batter, aiShotChoice, context);
        let timingPosition = this.ai.simulateTiming(batter, deliveryResult, context);

        if (!canRead) timingPosition = Math.random() * 100; // Penalize timing if deceived

        this.batting.currentDelivery = deliveryResult;
        this.batting.timingBarPosition = timingPosition;
        this.batting.timingBarActive = true; 

        const outcome = this.batting.executeShot(aiShotChoice.id, aimAngle);
        return this._resolveBallOutcome(outcome);
    }

    _resolveBallOutcome(outcome) {
        if (!outcome) return null;

        const batter = this.engine.getCurrentBatter();
        const bowler = this.engine.getCurrentBowler();

        // Process engine
        this.engine.processBall(outcome);
        const postBallContext = this.engine.getMatchContext();
        if (this.ai && typeof this.ai.onBallResolved === 'function') {
            this.ai.onBallResolved(outcome, postBallContext, {
                phase: this.phase,
                humanRole: this.currentModeCtrl?.humanRole || null,
                mode: this.currentMode
            });
        }

        // Generate Commentary
        const comm = this.commentary.generate(
            outcome,
            postBallContext,
            batter,
            bowler
        );

        const result = {
            outcome,
            commentary: comm.lines.join(' '),
            state: this.engine.state
        };

        this.emit('ballComplete', result);

        // Delegate next steps to the mode controller
        if (this.currentModeCtrl && this.currentModeCtrl.onBallComplete) {
            this.currentModeCtrl.onBallComplete(outcome);
        }

        return result;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameController };
}
