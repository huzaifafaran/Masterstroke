// ============================================================
// CRICKET LEGENDS — Bowling System
// ============================================================

class BowlingSystem {
    constructor(engine) {
        this.engine = engine;
        this.aimX = 50;  // 0-100 horizontal on pitch
        this.aimY = 50;  // 0-100 vertical (length)
        this.executionMeterActive = false;
        this.executionPosition = 0;
        this.executionSpeed = 4;
        this.selectedDelivery = null;
        this.lastExecutionQuality = null;
    }

    // ── Get available deliveries for current bowler ────────
    getAvailableDeliveries() {
        const bowler = this.engine.getCurrentBowler();
        return getDeliveriesForBowler(bowler);
    }

    // ── Select delivery and set aim ────────────────────────
    selectDelivery(deliveryId) {
        const deliveries = this.getAvailableDeliveries();
        this.selectedDelivery = deliveries.find(d => d.id === deliveryId) || deliveries[0];
        return this.selectedDelivery;
    }

    setAim(x, y) {
        this.aimX = Math.max(0, Math.min(100, x));
        this.aimY = Math.max(0, Math.min(100, y));
    }

    // ── Start execution meter ──────────────────────────────
    startExecution() {
        this.executionMeterActive = true;
        this.executionPosition = 0;
        this.executionSpeed = 3 + Math.random() * 3;
        return true;
    }

    // ── Execute delivery (player presses button) ───────────
    executeDelivery() {
        if (!this.executionMeterActive || !this.selectedDelivery) return null;
        this.executionMeterActive = false;

        const bowler = this.engine.getCurrentBowler();
        const attrs = this.engine.getEffectiveAttributes(bowler, 'bowling');
        const context = this.engine.getMatchContext();
        const delivery = this.selectedDelivery;

        // 1. Execution quality from meter position (50 = perfect)
        const execQuality = 1 - Math.abs(this.executionPosition - 50) / 50;
        this.lastExecutionQuality = execQuality;

        // 2. Control check — does the ball go where aimed?
        const controlCheck = Math.random() * 100;
        const controlPasses = controlCheck <= attrs.control;

        // 3. Actual landing position
        const aimConeRadius = 30 * (1 - attrs.accuracy / 125);
        let actualX = this.aimX;
        let actualY = this.aimY;

        if (!controlPasses || execQuality < 0.5) {
            const drift = aimConeRadius * (1 - execQuality);
            actualX += (Math.random() * 2 - 1) * drift;
            actualY += (Math.random() * 2 - 1) * drift;
            actualX = Math.max(0, Math.min(100, actualX));
            actualY = Math.max(0, Math.min(100, actualY));
        }

        // 4. Stamina penalty
        const bowlerStats = this.engine.getBowlerStats(bowler.id);
        const fatiguePenalty = bowlerStats ? (1 - bowlerStats.stamina / 100) * 0.2 : 0;

        // 5. Calculate delivery properties
        const deliveryResult = this.calculateDeliveryProperties(delivery, attrs, execQuality, fatiguePenalty, actualX, actualY, bowler, context);

        return deliveryResult;
    }

    // ── Calculate delivery physics ─────────────────────────
    calculateDeliveryProperties(delivery, attrs, execQuality, fatiguePenalty, landX, landY, bowler, context) {
        const isPace = isPaceBowler(bowler);

        // Speed
        let speed = isPace ?
            120 + (attrs.paceOrSpin / 100) * 40 :  // pace: 120-160kph
            70 + (attrs.paceOrSpin / 100) * 20;     // spin: 70-90kph

        speed *= (1 - fatiguePenalty);

        // Signature: Steyn express pace
        if (bowler.signature?.modifiers?.paceAdd && bowler.signature.condition(context)) {
            speed += 8;
        }

        // Slower ball
        if (delivery.id === 'slower_ball') speed *= 0.75;
        if (delivery.id === 'flighted') speed *= 0.85;

        // Swing/Turn
        let swingAmount = (attrs.swingOrTurn / 100) * 1.2;

        // Pitch modifier already applied in getEffectiveAttributes
        if (delivery.id === 'inswing' || delivery.id === 'outswing') swingAmount *= 1.3;
        if (delivery.id === 'doosra' || delivery.id === 'googly') swingAmount *= 1.2;

        // Wasim Akram sultan of swing
        if (bowler.signature?.modifiers?.swingAdd && bowler.signature.condition(context)) {
            swingAmount *= 1.3;
        }

        // Variation disguise
        let disguiseLevel = attrs.variation / 100;
        if (delivery.id === 'slower_ball' || delivery.id === 'doosra' || delivery.id === 'googly') {
            disguiseLevel *= execQuality; // perfect execution = maximum disguise
        }

        // Malinga death over disguise
        if (bowler.signature?.modifiers?.slowerBallDisguiseMult && bowler.signature.condition(context)) {
            disguiseLevel *= bowler.signature.modifiers.slowerBallDisguiseMult;
        }

        // Murali deception
        if (bowler.signature?.modifiers?.variationDisguiseMult) {
            disguiseLevel *= bowler.signature.modifiers.variationDisguiseMult;
        }

        // Bounce
        let bounce = 0.5; // normalized 0-1
        if (delivery.length === 'short') bounce = 0.85;
        if (delivery.length === 'full') bounce = 0.2;
        if (delivery.length === 'full_driving') bounce = 0.35;
        bounce += this.engine.pitch.bounceVar * (Math.random() * 2 - 1);

        // Yorker accuracy boost for Malinga
        let effectiveAccuracy = 1.0;
        if (delivery.id === 'yorker' && bowler.signature?.modifiers?.yorkerAccuracyAdd &&
            bowler.signature.condition(context)) {
            effectiveAccuracy = 1.3;
        }

        // Calculate difficulty for batter
        let difficulty = delivery.difficulty;
        difficulty *= (1 + swingAmount * 0.3);
        difficulty *= (1 + (speed - 100) / 200);
        if (disguiseLevel > 0.7) difficulty += 0.15;
        difficulty = Math.min(difficulty, 0.95);

        // Determine what the ball looks like to the batter
        const lineStr = landX < 35 ? 'outside off' : landX > 65 ? 'outside leg' : 'on the stumps';
        const lengthStr = delivery.length === 'short' ? 'short' :
            delivery.length === 'full' ? 'full' :
                delivery.length === 'full_driving' ? 'full' : 'good length';

        return {
            delivery: delivery,
            speed: Math.round(speed),
            swing: swingAmount,
            bounce: bounce,
            disguiseLevel: disguiseLevel,
            difficulty: difficulty,
            execQuality: execQuality,
            landX: landX,
            landY: landY,
            effectiveAccuracy: effectiveAccuracy,
            isPace: isPace,
            line: lineStr,
            length: lengthStr,
            description: `${delivery.name}, ${Math.round(speed)} kph, ${lineStr}, ${lengthStr}`
        };
    }

    // ── Can batter read this delivery? ─────────────────────
    canBatterRead(deliveryResult, batter) {
        const batterAttrs = this.engine.getEffectiveAttributes(batter, 'batting');
        const bowler = this.engine.getCurrentBowler();

        // Batter's read ability
        const batterRead = batterAttrs.composure * 0.4 + (batterAttrs.timing * 0.3) +
            (batter.physical.matchAwareness * 0.3);

        // Bowler's disguise
        const bowlerDisguise = deliveryResult.disguiseLevel * 100;

        let readChance = 0.5 + (batterRead - bowlerDisguise) / 200;

        // Murali batter read penalty
        if (bowler.signature?.modifiers?.batterReadMult) {
            readChance *= bowler.signature.modifiers.batterReadMult;
        }

        readChance = Math.max(0.1, Math.min(0.95, readChance));

        return Math.random() < readChance;
    }

    // ── Update execution meter (called every frame) ────────
    updateExecutionMeter(deltaTime) {
        if (!this.executionMeterActive) return;

        this.executionPosition += this.executionSpeed * deltaTime * 60;

        if (this.executionPosition >= 100) {
            this.executionPosition = 100;
            this.executionSpeed = -Math.abs(this.executionSpeed);
        } else if (this.executionPosition <= 0) {
            this.executionPosition = 0;
            this.executionSpeed = Math.abs(this.executionSpeed);
        }
    }

    // ── AI selects best aim position ───────────────────────
    getAIAimForDelivery(delivery, difficulty = 'medium') {
        const targets = {
            'yorker': { x: 50, y: 95 },
            'bouncer': { x: 50, y: 15 },
            'good_length': { x: 50, y: 55 },
            'full_length': { x: 50, y: 75 },
            'slower_ball': { x: 50, y: 60 },
            'inswing': { x: 60, y: 55 },
            'outswing': { x: 40, y: 55 },
            'stock': { x: 50, y: 55 },
            'doosra': { x: 45, y: 55 },
            'googly': { x: 55, y: 55 },
            'flighted': { x: 50, y: 65 },
            'arm_ball': { x: 50, y: 55 },
            'top_spinner': { x: 50, y: 55 }
        };

        const target = targets[delivery.id] || { x: 50, y: 55 };
        const scatter = { easy: 15, medium: 8, hard: 3 }[difficulty] || 8;

        return {
            x: target.x + (Math.random() * 2 - 1) * scatter,
            y: target.y + (Math.random() * 2 - 1) * scatter
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BowlingSystem };
}
