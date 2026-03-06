// ============================================================
// CRICKET LEGENDS — AI System
// ============================================================

class CricketAI {
    constructor(engine, battingSystem, bowlingSystem) {
        this.engine = engine;
        this.battingSystem = battingSystem;
        this.bowlingSystem = bowlingSystem;
    }

    // ── AI Batting Decision ────────────────────────────────
    decideBattingShot(delivery, batter) {
        const context = this.engine.getMatchContext();
        const tendency = batter.aiTendency || {};
        const difficultyMult = { easy: 0.5, medium: 0.75, hard: 0.95 }[this.engine.difficulty] || 0.75;

        // 1. Determine aggression level
        let aggression = tendency.aggression || 0.5;

        // Start slow tendency
        if (tendency.startSlow && context.currentBatterBalls < (tendency.accelerateAfterBalls || 20)) {
            aggression *= 0.5;
        }

        // Finisher mode (Dhoni)
        if (tendency.finisherMode && context.currentOver >= this.engine.totalOvers - 5) {
            aggression = 0.85;
        }

        // Chase pressure
        if (context.innings === 2 && context.requiredRunRate > 8) {
            aggression += 0.2;
        }
        if (context.innings === 2 && context.requiredRunRate > 12) {
            aggression += 0.3;
        }

        // Lara buildup
        if (batter.id === 'lara' && context.currentBatterRuns >= 30) {
            aggression += 0.3;
        }

        aggression = Math.min(1, aggression);

        // 2. Select shot type based on aggression and delivery
        const shot = this.selectAIShot(delivery, aggression, tendency, batter);

        // 3. Determine aim angle
        const aimAngle = this.getAIAimAngle(shot, tendency);

        // 4. Simulate timing quality
        const timingQuality = this.simulateAITiming(batter, delivery, difficultyMult);

        return { shot, aimAngle, timingPosition: timingQuality };
    }

    selectAIShot(delivery, aggression, tendency, batter) {
        const shots = [...SHOT_TYPES];
        const weights = {};

        shots.forEach(shot => {
            let weight = 1;

            // Base aggression alignment
            if (shot.risk <= 0.15 && aggression < 0.4) weight += 3;
            if (shot.risk > 0.3 && aggression > 0.7) weight += 3;
            if (shot.risk > 0.4 && aggression > 0.85) weight += 4;

            // Delivery-shot matchup
            if (shot.id === 'pull' && delivery.length === 'short') weight += 5;
            if (shot.id === 'drive' && (delivery.length === 'full_driving' || delivery.length === 'good')) weight += 3;
            if (shot.id === 'defensive' && delivery.difficulty > 0.6) weight += 4;
            if (shot.id === 'sweep' && !delivery.isPace) weight += 2;

            // Player-specific biases
            if (tendency.loftedChance && shot.id === 'lofted') weight += tendency.loftedChance * 10;
            if (tendency.noSweep && shot.id === 'sweep') weight = 0;
            if (batter.id === 'devilliers' && shot.category === 'innovative') weight += 3;

            // Don't play innovative shots on easy difficulty
            if (this.engine.difficulty === 'easy' && shot.category === 'innovative') weight *= 0.2;

            weights[shot.id] = Math.max(0, weight);
        });

        return this.weightedRandom(shots, weights);
    }

    getAIAimAngle(shot, tendency) {
        let baseAngle;

        if (tendency.preferredSide === 'offside') baseAngle = 300 + Math.random() * 60;
        else if (tendency.preferredSide === 'legside') baseAngle = 120 + Math.random() * 60;
        else if (tendency.preferredSide === 'all360') baseAngle = Math.random() * 360;
        else baseAngle = Math.random() * 360;

        // Shot-specific angles
        if (shot.id === 'drive') baseAngle = 270 + Math.random() * 90;
        if (shot.id === 'pull') baseAngle = 90 + Math.random() * 90;
        if (shot.id === 'sweep') baseAngle = 100 + Math.random() * 80;
        if (shot.id === 'cut') baseAngle = 300 + Math.random() * 50;

        return baseAngle % 360;
    }

    simulateAITiming(batter, delivery, difficultyMult) {
        const attrs = this.engine.getEffectiveAttributes(batter, 'batting');
        const timingSkill = attrs.timing / 100;

        // Higher skill = closer to center (50 = perfect)
        const targetPos = 50;
        const maxError = 50 * (1 - timingSkill * difficultyMult);
        const error = (Math.random() * 2 - 1) * maxError;

        // Harder deliveries increase error
        const deliveryPenalty = delivery.difficulty * 20 * (1 - difficultyMult);

        let position = targetPos + error + (Math.random() * 2 - 1) * deliveryPenalty;
        return Math.max(0, Math.min(100, position));
    }

    // ── AI Bowling Decision ────────────────────────────────
    decideBowlingDelivery(batter) {
        const context = this.engine.getMatchContext();
        const bowler = this.engine.getCurrentBowler();
        const tendency = bowler.aiTendency || {};
        const deliveries = this.bowlingSystem.getAvailableDeliveries();
        const difficultyMult = { easy: 0.5, medium: 0.75, hard: 0.95 }[this.engine.difficulty] || 0.75;

        // 1. Select delivery type
        const delivery = this.selectAIDelivery(deliveries, batter, bowler, tendency, context);

        // 2. Get aim position
        const aim = this.bowlingSystem.getAIAimForDelivery(delivery, this.engine.difficulty);

        // 3. Simulate execution quality
        const execQuality = this.simulateAIExecution(bowler, delivery, difficultyMult);

        return { delivery, aim, executionPosition: execQuality };
    }

    selectAIDelivery(deliveries, batter, bowler, tendency, context) {
        const weights = {};
        const batterStats = this.engine.getBatterStats(batter.id);
        const isDeathOvers = context.currentOver >= this.engine.totalOvers - 4;

        deliveries.forEach(d => {
            let weight = 5; // base

            // Death overs — more yorkers
            if (isDeathOvers && d.id === 'yorker') {
                weight += tendency.deathOverYorkerChance ? tendency.deathOverYorkerChance * 15 : 8;
            }

            // New ball — more swing
            if (context.currentOver < 6 && (d.id === 'outswing' || d.id === 'inswing')) {
                weight += 5;
            }

            // Bouncer tendency
            if (d.id === 'bouncer' && tendency.bouncerChance) weight += tendency.bouncerChance * 10;

            // Against aggressive batter — slower balls and yorkers
            if (batter.aiTendency?.aggression > 0.7 && d.id === 'slower_ball') weight += 5;
            if (batter.aiTendency?.aggression > 0.7 && d.id === 'yorker') weight += 4;

            // Variation based on recent overs
            if (d.id === 'good_length') weight += 3; // safe default

            // Spin-specific
            if (d.id === 'doosra' && tendency.doosraFrequency) weight += tendency.doosraFrequency * 12;
            if (d.id === 'googly' && tendency.googlyFrequency) weight += tendency.googlyFrequency * 12;
            if (d.id === 'flighted' && tendency.flightedChance) weight += tendency.flightedChance * 10;

            weights[d.id] = weight;
        });

        return this.weightedRandom(deliveries, weights);
    }

    simulateAIExecution(bowler, delivery, difficultyMult) {
        const attrs = this.engine.getEffectiveAttributes(bowler, 'bowling');
        const controlSkill = attrs.control / 100;

        const targetPos = 50;
        const maxError = 50 * (1 - controlSkill * difficultyMult);
        const error = (Math.random() * 2 - 1) * maxError;

        const difficultyPenalty = delivery.difficulty * 15 * (1 - difficultyMult);

        let position = targetPos + error + (Math.random() * 2 - 1) * difficultyPenalty;
        return Math.max(0, Math.min(100, position));
    }

    // ── Utility ────────────────────────────────────────────
    weightedRandom(items, weights) {
        const totalWeight = items.reduce((sum, item) => sum + (weights[item.id] || 1), 0);
        let random = Math.random() * totalWeight;
        for (const item of items) {
            random -= (weights[item.id] || 1);
            if (random <= 0) return item;
        }
        return items[0];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CricketAI };
}
