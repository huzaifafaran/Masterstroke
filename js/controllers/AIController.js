// ============================================================
// CRICKET LEGENDS — AI Controller (New Architecture)
// ============================================================

class AIController {
    constructor(engine, battingSystem, bowlingSystem) {
        this.engine = engine;
        this.battingSystem = battingSystem;
        this.bowlingSystem = bowlingSystem;
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
        const tendency = batter.aiTendency || {};
        
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

        // Chase pressure
        if (context.innings === 2 && context.requiredRunRate) {
            if (context.requiredRunRate > 8) aggression += 0.2;
            if (context.requiredRunRate > 12) aggression += 0.3;
        }

        aggression = Math.max(0.1, Math.min(1.0, aggression));

        // 2. Select shot type
        const shots = [...(typeof SHOT_TYPES !== 'undefined' ? SHOT_TYPES : [])];
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

            weights[shot.id] = Math.max(0, weight);
        });

        return this._weightedRandom(shots, weights);
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
        // Expect context to have: currentOver, batter (object), innings details
        const batter = context.batter || this.engine.getCurrentBatter();
        const batterTendency = batter?.aiTendency || {};
        const bowlerTendency = bowler.aiTendency || {};
        const deliveries = this.bowlingSystem ? this.bowlingSystem.getAvailableDeliveries() : [];
        if (deliveries.length === 0) return null;

        const isDeathOvers = context.currentOver >= this.engine.totalOvers - 4;
        const weights = {};

        deliveries.forEach(d => {
            let weight = 5; // base

            // Death overs — more yorkers
            if (isDeathOvers && d.id === 'yorker') {
                weight += bowlerTendency.deathOverYorkerChance ? bowlerTendency.deathOverYorkerChance * 15 : 8;
            }

            // New ball — more swing
            if (context.currentOver < 6 && (d.id === 'outswing' || d.id === 'inswing')) {
                weight += 5;
            }

            // Bouncer tendency
            if (d.id === 'bouncer' && bowlerTendency.bouncerChance) weight += bowlerTendency.bouncerChance * 10;

            // Against aggressive batter
            if (batterTendency.aggression > 0.7 && d.id === 'slower_ball') weight += 5;
            if (batterTendency.aggression > 0.7 && d.id === 'yorker') weight += 4;

            // Safe default
            if (d.id === 'good_length') weight += 3;

            // Spin-specific
            if (d.id === 'doosra' && bowlerTendency.doosraFrequency) weight += bowlerTendency.doosraFrequency * 12;
            if (d.id === 'googly' && bowlerTendency.googlyFrequency) weight += bowlerTendency.googlyFrequency * 12;
            if (d.id === 'flighted' && bowlerTendency.flightedChance) weight += bowlerTendency.flightedChance * 10;

            weights[d.id] = weight;
        });

        return this._weightedRandom(deliveries, weights);
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
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIController };
}
