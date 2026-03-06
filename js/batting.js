// ============================================================
// CRICKET LEGENDS - Batting System (Simulation Pipeline)
// ============================================================
// Layers:
//   1) Contact model
//   2) Trajectory model
//   3) Field interception model
// External compatibility is preserved for engine/app integration.
// ============================================================

const CONTACT_TYPES = Object.freeze({
    MISS: 'miss',
    EDGE: 'edge',
    WEAK: 'weak',
    CLEAN: 'clean',
    SWEET: 'sweet'
});

const TIMING_TRANSFER = {
    perfect:    { power: 1.08, control: 1.10, elevation: 0 },
    good:       { power: 0.95, control: 0.95, elevation: 0 },
    early:      { power: 0.78, control: 0.72, elevation: 6 },
    late:       { power: 0.82, control: 0.74, elevation: -4 },
    very_early: { power: 0.58, control: 0.46, elevation: 12 },
    very_late:  { power: 0.62, control: 0.50, elevation: -8 }
};

const CONTACT_BASE_PROB = {
    perfect:    { miss: 0.01, edge: 0.03, weak: 0.10, clean: 0.52, sweet: 0.34 },
    good:       { miss: 0.03, edge: 0.10, weak: 0.25, clean: 0.47, sweet: 0.15 },
    early:      { miss: 0.09, edge: 0.26, weak: 0.39, clean: 0.21, sweet: 0.05 },
    late:       { miss: 0.08, edge: 0.24, weak: 0.40, clean: 0.22, sweet: 0.06 },
    very_early: { miss: 0.24, edge: 0.34, weak: 0.30, clean: 0.10, sweet: 0.02 },
    very_late:  { miss: 0.22, edge: 0.35, weak: 0.31, clean: 0.10, sweet: 0.02 }
};

const CONTACT_FACTORS = {
    miss:  { power: 0.02, control: 0.08, elevation: -8 },
    edge:  { power: 0.42, control: 0.35, elevation: 6 },
    weak:  { power: 0.62, control: 0.56, elevation: 0 },
    clean: { power: 0.95, control: 0.88, elevation: 2 },
    sweet: { power: 1.16, control: 1.02, elevation: 4 }
};

const DEFAULT_MATCHUP_PROFILE = {
    length: { yorker: 1.0, full: 1.0, full_driving: 1.0, good: 1.0, short: 1.0 },
    line: { outside_off: 1.0, stumps: 1.0, outside_leg: 1.0 },
    delivery: {},
    paceSpin: { pace: 1.0, spin: 1.0 },
    movementSensitivity: 0.7
};

const DEFAULT_SHOT_TRAJECTORY_PROFILE = {
    baseElevation: 14,
    groundRoll: 0.45,
    aerialBias: 0.45,
    controlBias: 1.0
};

const DEFAULT_PITCH_TRAJECTORY_MODS = {
    carry: 1.0,
    outfield: 1.0,
    boundaryEase: 1.0,
    edgeAssist: 1.0,
    bounceVariance: 0.1
};

const DEFAULT_FIELD_DENSITY = {
    straight: 0.34,
    offside: 0.60,
    legside: 0.54,
    deep: 0.42,
    innerRing: 0.70
};

class BattingSystem {
    constructor(engine) {
        this.engine = engine;
        this.timingBarActive = false;
        this.timingBarPosition = 0;
        this.timingBarSpeed = 3;
        this.timingBarDirection = 1;
        this.selectedShot = SHOT_TYPES[1]; // drive
        this.aimAngle = 0;
        this.lastTimingResult = null;
        this.timingZones = null;
        this.lastShotDiagnostics = null;
        this.currentDelivery = null;
    }

    // ------------------------------------------------------------
    // Timing layer
    // ------------------------------------------------------------
    startTimingSequence(delivery, selectedShot) {
        const batter = this.engine.getCurrentBatter();
        const baseZones = this.engine.getTimingWindow(batter);
        const shot = selectedShot || this.selectedShot || SHOT_TYPES[1];
        this.selectedShot = shot;

        this.timingZones = this.getZonesForShot(baseZones, shot);

        const rawSpeed = delivery?.speed ?? this.engine.getCurrentBowler()?.bowling?.paceOrSpin ?? 80;
        const speedNorm = this.clamp((rawSpeed - 70) / 90, 0, 1);
        const deliveryDifficulty = this.clamp(delivery?.difficulty ?? 0.35, 0, 1);

        this.timingBarSpeed = 2.2 + speedNorm * 3.6 + deliveryDifficulty * 1.2;
        if (shot.risk > 0.3) this.timingBarSpeed *= 1 + shot.risk * 0.35;

        this.timingBarActive = true;
        this.timingBarPosition = 0;
        this.timingBarDirection = 1;
        this.currentDelivery = delivery;

        return this.timingZones;
    }

    getZonesForShot(baseZones, shot) {
        if (!shot || !baseZones) return baseZones;

        const total = Math.max(80, baseZones.total || 200);
        const risk = this.clamp(shot.risk || 0.2, 0, 0.8);
        const perfectMult = {
            defensive: 1.55,
            drive: 1.05,
            pull: 0.95,
            sweep: 0.90,
            cut: 1.00,
            lofted: 0.62,
            scoop: 0.50,
            switch_hit: 0.50
        }[shot.id] || 1.0;

        const perfect = this.clamp(baseZones.perfect * perfectMult, total * 0.10, total * 0.72);
        const side = (total - perfect) / 2;
        const goodSlice = this.clamp(side * (0.34 - risk * 0.08), side * 0.18, side * 0.40);
        const earlySlice = side * 0.36;
        const verySlice = Math.max(0, side - goodSlice - earlySlice);

        const bands = [];
        let cursor = 0;
        const addBand = (grade, width) => {
            bands.push({ grade, start: cursor, end: cursor + width });
            cursor += width;
        };

        addBand('very_early', verySlice);
        addBand('early', earlySlice);
        addBand('good', goodSlice);
        addBand('perfect', perfect);
        addBand('good', goodSlice);
        addBand('late', earlySlice);
        addBand('very_late', verySlice);

        return {
            total: total,
            perfect: perfect,
            early: side,
            late: side,
            good: goodSlice * 2,
            veryEarly: verySlice,
            veryLate: verySlice,
            bands: bands
        };
    }

    evaluateTiming(position) {
        const zones = this.timingZones || this.getZonesForShot({ total: 200, perfect: 70 }, this.selectedShot || SHOT_TYPES[1]);
        const total = zones.total || 200;
        const posInWindow = (this.clamp(position, 0, 100) / 100) * total;
        const bands = zones.bands || [];
        const band = bands.find((b) => posInWindow >= b.start && posInWindow <= b.end) || bands[bands.length - 1];

        const width = Math.max(1, band.end - band.start);
        const local = (posInWindow - band.start) / width;
        const centerDist = Math.abs(local - 0.5) * 2;

        const baseQuality = {
            perfect: 0.98,
            good: 0.82,
            early: 0.58,
            late: 0.60,
            very_early: 0.34,
            very_late: 0.36
        }[band.grade] || 0.5;

        const quality = this.clamp(baseQuality - centerDist * 0.18, 0.05, 1.0);
        const transfer = TIMING_TRANSFER[band.grade] || TIMING_TRANSFER.good;

        const legacyGrade = band.grade === 'perfect' || band.grade === 'good'
            ? 'perfect'
            : (band.grade === 'early' || band.grade === 'very_early' ? 'early' : 'late');

        return {
            grade: band.grade,
            legacyGrade: legacyGrade,
            quality: quality,
            powerTransfer: transfer.power,
            controlTransfer: transfer.control,
            elevationBias: transfer.elevation
        };
    }

    updateTimingBar(deltaTime) {
        if (!this.timingBarActive) return;

        this.timingBarPosition += this.timingBarSpeed * this.timingBarDirection * deltaTime * 60;
        if (this.timingBarPosition >= 100) {
            this.timingBarPosition = 100;
            this.timingBarDirection = -1;
        } else if (this.timingBarPosition <= 0) {
            this.timingBarPosition = 0;
            this.timingBarDirection = 1;
        }
    }

    // ------------------------------------------------------------
    // Matchup layer (data driven)
    // ------------------------------------------------------------
    calculateShotMatchup(shot, delivery) {
        const profile = this.getShotMatchupProfile(shot?.id);
        const lengthKey = this.normalizeLength(delivery?.length || delivery?.delivery?.length);
        const lineKey = this.normalizeLine(delivery?.line);
        const deliveryId = this.getDeliveryId(delivery);
        const paceSpin = delivery?.isPace ? 'pace' : 'spin';
        const movement = this.getMovementMagnitude(delivery);
        const deliveryDifficulty = this.clamp(delivery?.difficulty ?? 0.35, 0, 1);

        let score = 1.0;
        score *= this.lookup(profile.length, lengthKey, 1.0);
        score *= this.lookup(profile.line, lineKey, 1.0);
        score *= this.lookup(profile.paceSpin, paceSpin, 1.0);
        score *= this.lookup(profile.delivery, deliveryId, 1.0);

        const movementPenalty = (profile.movementSensitivity ?? 0.7) * movement * 0.18;
        score *= (1 - movementPenalty);
        score *= (1 - deliveryDifficulty * 0.08);

        // Legacy hard rules remain in data-compatible form.
        if (shot?.id === 'pull' && lengthKey === 'short') score *= 1.08;
        if (shot?.id === 'drive' && (lengthKey === 'full' || lengthKey === 'full_driving')) score *= 1.06;
        if (shot?.id === 'drive' && deliveryId === 'bouncer') score *= 0.65;
        if (shot?.id === 'sweep' && delivery?.isPace) score *= 0.72;
        if (shot?.id === 'sweep' && !delivery?.isPace) score *= 1.07;

        return this.clamp(score, 0.15, 1.95);
    }

    // Compatibility alias for previous internal call paths.
    calculateMatchup(shot, delivery) {
        return this.calculateShotMatchup(shot, delivery);
    }

    // ------------------------------------------------------------
    // Main orchestrator
    // ------------------------------------------------------------
    executeShot(shotType, aimAngle) {
        if (!this.timingBarActive) return null;
        this.timingBarActive = false;

        const batter = this.engine.getCurrentBatter();
        const bowler = this.engine.getCurrentBowler();
        const delivery = this.currentDelivery;
        const batterAttrs = this.engine.getEffectiveAttributes(batter, 'batting');
        const timing = this.evaluateTiming(this.timingBarPosition);

        const outcome = this.resolveShotOutcome({
            shotType,
            aimAngle,
            timing,
            delivery,
            batter,
            bowler,
            batterAttrs
        });

        this.lastTimingResult = timing;
        return outcome;
    }

    resolveShotOutcome({ shotType, aimAngle, timing, delivery, batter, bowler, batterAttrs }) {
        const context = this.engine.getMatchContext();
        const bowlerAttrs = this.engine.getEffectiveAttributes(bowler, 'bowling');
        const shot = SHOT_TYPES.find((s) => s.id === shotType) || SHOT_TYPES[1];
        const matchupScore = this.calculateShotMatchup(shot, delivery);

        const contact = this.resolveContact({
            timing,
            shot,
            matchupScore,
            batterAttrs,
            bowlerAttrs,
            delivery,
            context,
            batter
        });

        const trajectory = this.resolveTrajectory({
            contact,
            shot,
            timing,
            matchupScore,
            batterAttrs,
            delivery,
            aimAngle,
            context,
            batter
        });

        const field = this.resolveFieldResult({
            contact,
            trajectory,
            shot,
            timing,
            delivery,
            batter,
            context
        });

        this.lastShotDiagnostics = {
            timing: timing.grade,
            contactType: contact.type,
            matchup: matchupScore.toFixed(3),
            distance: trajectory.travelDistance.toFixed(1),
            elevation: trajectory.elevation.toFixed(1)
        };

        return {
            runs: field.runs,
            wicket: field.wicket,
            boundary: !field.wicket && field.runs === 4,
            six: !field.wicket && field.runs === 6,
            edge: !!field.edge,
            timing: timing.legacyGrade,      // keeps UI and CSS compatibility
            timingDetail: timing.grade,      // richer output for AI/telemetry
            shotType: shot.id,
            deliveryType: this.getDeliveryId(delivery),
            angle: trajectory.angle,
            distance: trajectory.travelDistance,
            description: field.description,
            dismissal: field.dismissal || null,
            contactType: contact.type
        };
    }

    // ------------------------------------------------------------
    // Contact model
    // ------------------------------------------------------------
    resolveContact({ timing, shot, matchupScore, batterAttrs, bowlerAttrs, delivery, context, batter }) {
        const probs = { ...(CONTACT_BASE_PROB[timing.grade] || CONTACT_BASE_PROB.good) };
        const pressure = context?.pressure ?? this.engine.calculatePressure();
        const risk = this.clamp(shot.risk || 0.2, 0, 0.8);
        const skill = (
            (batterAttrs.timing || 50) * 0.38 +
            (batterAttrs.shotPlacement || 50) * 0.26 +
            (batterAttrs.composure || 50) * 0.22 +
            (batterAttrs.footwork || 50) * 0.14
        ) / 100;

        const deliveryThreat = this.clamp(
            (delivery?.difficulty || 0.35) * 1.2 +
            (bowlerAttrs.swingOrTurn || 50) / 220 +
            (bowlerAttrs.variation || 50) / 260 +
            (bowlerAttrs.accuracy || 50) / 400,
            0,
            1.6
        );
        const mismatch = this.clamp(1.1 - matchupScore, 0, 1.0);

        probs.sweet += (skill - 0.55) * 0.28 + (matchupScore - 1) * 0.25 - risk * 0.16;
        probs.clean += (skill - 0.50) * 0.25 + (matchupScore - 1) * 0.22 - deliveryThreat * 0.09;
        probs.weak += mismatch * 0.22 + pressure * 0.10;
        probs.edge += mismatch * 0.28 + risk * 0.22 + deliveryThreat * 0.18 + (1 - timing.quality) * 0.26;
        probs.miss += mismatch * 0.18 + risk * 0.12 + deliveryThreat * 0.16 +
            ((timing.grade === 'very_early' || timing.grade === 'very_late') ? 0.12 : 0);

        // Signature ability integration at contact layer.
        if (batter?.signature?.modifiers?.innovativeMistimePenaltyMult && shot.category === 'innovative') {
            const m = batter.signature.modifiers.innovativeMistimePenaltyMult;
            probs.edge *= m;
            probs.miss *= m;
            probs.clean += 0.05;
        }
        if (batter?.id === 'devilliers' && shot.category === 'innovative') {
            probs.clean += 0.06;
            probs.sweet += 0.03;
        }
        if (batter?.id === 'gayle' && shot.category === 'power') {
            probs.sweet += 0.05;
        }

        this.normalizeProbabilityObject(probs);
        let sampledType = this.weightedPick(probs);

        const edgeChance = this.resolveEdgeChance({
            timing,
            shot,
            matchupScore,
            batterAttrs,
            delivery,
            context,
            batter
        });

        if (sampledType !== CONTACT_TYPES.MISS && Math.random() < edgeChance) {
            sampledType = CONTACT_TYPES.EDGE;
        }

        const cf = CONTACT_FACTORS[sampledType] || CONTACT_FACTORS.weak;
        const powerFactor = this.clamp(
            cf.power *
                timing.powerTransfer *
                (0.78 + (batterAttrs.power || 50) / 320) *
                (0.88 + matchupScore * 0.14),
            0.01,
            1.65
        );
        const controlFactor = this.clamp(
            cf.control *
                timing.controlTransfer *
                (0.72 + (batterAttrs.shotPlacement || 50) / 300),
            0.05,
            1.40
        );
        const elevationBias = cf.elevation + timing.elevationBias +
            ((shot.category === 'power' || shot.category === 'innovative') ? 2 : 0);

        return {
            type: sampledType,
            powerFactor: powerFactor,
            controlFactor: controlFactor,
            elevationBias: elevationBias,
            edgeChance: edgeChance
        };
    }

    resolveEdgeChance({ timing, shot, matchupScore, batterAttrs, delivery, context, batter }) {
        const movement = this.getMovementMagnitude(delivery);
        const pressure = context?.pressure ?? this.engine.calculatePressure();
        const pitchMods = this.getPitchTrajectoryModifiers(context?.pitch || this.engine.pitch);
        const risk = this.clamp(shot.risk || 0.2, 0, 0.8);

        const timingPenalty = {
            perfect: 0.00,
            good: 0.03,
            early: 0.10,
            late: 0.09,
            very_early: 0.17,
            very_late: 0.16
        }[timing.grade] || 0.08;

        let chance =
            0.03 +
            timingPenalty +
            this.clamp(1.1 - matchupScore, 0, 1) * 0.28 +
            movement * 0.18 +
            risk * 0.12 +
            (delivery?.difficulty || 0.35) * 0.12 +
            pressure * 0.05;

        const mitigation = ((batterAttrs.timing || 50) + (batterAttrs.composure || 50)) / 260;
        chance *= (1 - mitigation * 0.55);
        chance *= pitchMods.edgeAssist;

        if (shot.id === 'defensive') chance *= 0.70;
        if (shot.category === 'innovative') chance *= 1.15;
        if (batter?.signature?.modifiers?.innovativeMistimePenaltyMult && shot.category === 'innovative') {
            chance *= batter.signature.modifiers.innovativeMistimePenaltyMult;
        }

        return this.clamp(chance, 0.01, 0.75);
    }

    // ------------------------------------------------------------
    // Trajectory model
    // ------------------------------------------------------------
    resolveTrajectory({ contact, shot, timing, matchupScore, batterAttrs, delivery, aimAngle, context, batter }) {
        if (contact.type === CONTACT_TYPES.MISS) {
            return { angle: this.normalizeAngle(aimAngle), elevation: 0, speed: 0, travelDistance: 0, travelTime: 0.15 };
        }

        const shotProfile = this.getShotTrajectoryProfile(shot.id);
        const pitchMods = this.getPitchTrajectoryModifiers(context?.pitch || this.engine.pitch);
        const deliveryId = this.getDeliveryId(delivery);
        const powerAttr = this.clamp((batterAttrs.power || 50) / 100, 0.3, 1.0);

        const baseExitVelocity = 14 + powerAttr * 12 + (shot.powerMult || 0.7) * 8; // m/s
        let exitVelocity = baseExitVelocity *
            contact.powerFactor *
            (0.85 + matchupScore * 0.20) *
            pitchMods.carry;

        if (contact.type === CONTACT_TYPES.EDGE) exitVelocity *= 0.72;

        // Signature abilities influence physics, never force runs.
        if (batter?.signature?.modifiers?.sixDistanceMult && (shot.category === 'power' || shot.category === 'innovative')) {
            const sixMult = batter.signature.modifiers.sixDistanceMult;
            exitVelocity *= 1 + (sixMult - 1) * 0.45;
        }
        if (batter?.signature?.modifiers?.helicopterPowerAdd &&
            batter?.signature?.condition?.(context) &&
            deliveryId === 'yorker' &&
            (shot.id === 'lofted' || shot.id === 'scoop' || shot.id === 'switch_hit')) {
            exitVelocity *= 1 + (batter.signature.modifiers.helicopterPowerAdd / 250);
            // Mark as used once per innings.
            if (this.engine?.state) this.engine.state.helicopterUsed = true;
        }

        const controlSpreadBase =
            (18 * (1 - this.clamp(contact.controlFactor, 0, 1.3))) +
            (shot.risk || 0.2) * 14 +
            (1 - timing.quality) * 10;
        let spread = controlSpreadBase * (shotProfile.controlBias || 1.0);

        if (batter?.signature?.modifiers?.extraShotAngles) spread *= 0.82;
        if (batter?.id === 'devilliers') spread *= 0.90;

        let angle = this.normalizeAngle(aimAngle + this.randomRange(-spread, spread));
        if (contact.type === CONTACT_TYPES.EDGE) {
            const edgeBase = this.resolveEdgeBaseAngle(delivery, timing.grade);
            angle = this.normalizeAngle(edgeBase + this.randomRange(-12, 12));
        }

        let elevation =
            (shotProfile.baseElevation || 14) +
            contact.elevationBias +
            ((delivery?.bounce || 0.5) - 0.5) * 12;

        if (contact.type === CONTACT_TYPES.EDGE) {
            elevation = this.clamp(16 + Math.random() * 20 + (timing.grade === 'very_early' ? 8 : 0), 8, 52);
        } else {
            if (shot.category === 'power' || shot.category === 'innovative') elevation += 4;
            if (contact.type === CONTACT_TYPES.WEAK) elevation -= 3;
        }
        if (shot.id === 'defensive') elevation = Math.min(elevation, 14);
        elevation = this.clamp(elevation, 2, 68);

        const rad = this.toRad(elevation);
        const ballisticCarry = (exitVelocity * exitVelocity * Math.sin(2 * rad)) / 11.8;
        let groundRoll = Math.max(0, (exitVelocity * Math.cos(rad) - 7)) *
            (shotProfile.groundRoll || 0.45) *
            pitchMods.outfield;
        if (elevation > 30) groundRoll *= 0.5;
        if (contact.type === CONTACT_TYPES.EDGE) groundRoll *= 0.8;

        let travelDistance =
            ballisticCarry * (0.72 + (shotProfile.aerialBias || 0.45) * 0.35) +
            groundRoll;
        if (shot.id === 'defensive') travelDistance *= 0.55;
        travelDistance *= 1 + this.randomRange(-pitchMods.bounceVariance, pitchMods.bounceVariance) * 0.25;
        travelDistance = this.clamp(travelDistance, 0, 130);

        const airTime = Math.max(0.1, (2 * exitVelocity * Math.sin(rad)) / 9.81);
        const groundTime = travelDistance / Math.max(5, exitVelocity * Math.cos(rad));
        const travelTime = this.clamp(airTime + groundTime, 0.15, 6.5);

        return {
            angle: angle,
            elevation: elevation,
            speed: exitVelocity,
            travelDistance: travelDistance,
            travelTime: travelTime
        };
    }

    // ------------------------------------------------------------
    // Field interception model
    // ------------------------------------------------------------
    resolveFieldResult({ contact, trajectory, shot, timing, delivery, batter, context }) {
        const fieldDensity = this.getFieldDensity(context, trajectory.angle, shot.category);
        const zone = this.getAngleZone(trajectory.angle);
        const pitchMods = this.getPitchTrajectoryModifiers(context?.pitch || this.engine.pitch);

        const dismissal = this.resolveDismissal({
            contact,
            trajectory,
            shot,
            timing,
            delivery,
            fieldDensity,
            zone,
            context
        });
        if (dismissal.isWicket) {
            return {
                runs: 0,
                wicket: true,
                edge: contact.type === CONTACT_TYPES.EDGE,
                dismissal: dismissal.type,
                description: dismissal.description
            };
        }

        if (contact.type === CONTACT_TYPES.EDGE) {
            return this.resolveEdgeOutcome({ trajectory, fieldDensity, zone, delivery });
        }

        const boundaryLine = this.getBoundaryDistance(pitchMods, zone);
        const isAerial = trajectory.elevation >= 22;

        if (trajectory.travelDistance >= boundaryLine) {
            if (isAerial) {
                const sixChance = this.getSixProbability({
                    trajectory,
                    contact,
                    shot,
                    fieldDensity,
                    pitchMods,
                    batter,
                    boundaryLine
                });
                if (Math.random() < sixChance) {
                    return { runs: 6, wicket: false, edge: false, dismissal: null, description: 'Clean strike over the rope for six.' };
                }
            }
            return { runs: 4, wicket: false, edge: false, dismissal: null, description: 'Placed into space and it reaches the boundary.' };
        }

        const infieldCutoff = 30;
        const infield = trajectory.travelDistance < infieldCutoff;
        const zoneDensity = this.lookup(fieldDensity, zone, fieldDensity.straight);
        const ringFactor = infield ? fieldDensity.innerRing : fieldDensity.deep;
        const coverage = this.clamp(zoneDensity * 0.65 + ringFactor * 0.35, 0, 1);

        let runPotential =
            trajectory.travelDistance / 24 +
            (1 - coverage) * 1.30 +
            contact.controlFactor * 0.28 -
            (infield ? 0.55 : 0.0);

        // Signature ability integration at interception layer.
        if (batter?.id === 'kohli') runPotential += 0.18;
        if (batter?.signature?.modifiers?.gapAccuracyAdd) {
            runPotential += (batter.signature.modifiers.gapAccuracyAdd / 100) * 0.16;
        }
        if (batter?.signature?.modifiers?.runSpeedMult) {
            runPotential += (batter.signature.modifiers.runSpeedMult - 1) * 0.25;
        }
        if (shot.id === 'defensive') runPotential -= 0.20;

        let runs = 0;
        if (runPotential < 0.55) runs = 0;
        else if (runPotential < 1.35) runs = 1;
        else if (runPotential < 2.35) runs = 2;
        else runs = 3;

        const misfieldChance = this.clamp(
            (1 - coverage) * 0.06 +
            (trajectory.speed / 40) * 0.04 +
            ((context?.phase === 'death') ? 0.03 : 0.0) -
            contact.controlFactor * 0.03,
            0.01,
            0.22
        );

        let misfield = false;
        if (Math.random() < misfieldChance && runs < 3) {
            runs += 1;
            misfield = true;
        }

        if (runs === 0) {
            return {
                runs: 0,
                wicket: false,
                edge: false,
                dismissal: null,
                description: 'Stopped in the ring. Dot ball.'
            };
        }

        const runText = `${runs} run${runs === 1 ? '' : 's'}`;
        return {
            runs: runs,
            wicket: false,
            edge: false,
            dismissal: null,
            description: misfield ? `${runText} after a misfield in the circle.` : `${runText} completed with controlled running.`
        };
    }

    resolveDismissal({ contact, trajectory, shot, timing, delivery, fieldDensity, zone, context }) {
        const deliveryId = this.getDeliveryId(delivery);
        const boundaryLine = this.getBoundaryDistance(this.getPitchTrajectoryModifiers(context?.pitch || this.engine.pitch), zone);

        // Bowled / LBW layer
        if (contact.type === CONTACT_TYPES.MISS || timing.grade === 'very_early' || timing.grade === 'very_late') {
            let bowledChance = 0.01;
            let lbwChance = 0.01;

            if (deliveryId === 'yorker') bowledChance += 0.20;
            if (deliveryId === 'inswing') lbwChance += 0.18;
            if (deliveryId === 'doosra' || deliveryId === 'googly') bowledChance += 0.12;
            if (shot.id !== 'defensive') {
                bowledChance += 0.04;
                lbwChance += 0.03;
            }

            const roll = Math.random();
            if (roll < bowledChance) {
                return { isWicket: true, type: 'Bowled', description: 'Misses it completely and the stumps are hit.' };
            }
            if (roll < bowledChance + lbwChance) {
                return { isWicket: true, type: 'LBW', description: 'Pinned in front. Given LBW.' };
            }
        }

        // Edge catches: slip and keeper
        if (contact.type === CONTACT_TYPES.EDGE) {
            const outsideOff = this.normalizeLine(delivery?.line) === 'outside_off';
            const slipChance =
                (outsideOff ? 0.16 : 0.08) *
                this.clamp(fieldDensity.offside + fieldDensity.innerRing * 0.35, 0.2, 1.0);
            const keeperChance =
                0.10 *
                this.clamp(fieldDensity.innerRing * 0.8, 0.15, 0.95) *
                (trajectory.elevation < 16 ? 1.10 : 0.65);

            const roll = Math.random();
            if (roll < slipChance) {
                return { isWicket: true, type: 'Edge slip', description: 'Thick edge and taken at slip.' };
            }
            if (roll < slipChance + keeperChance) {
                return { isWicket: true, type: 'Caught behind', description: 'Fine edge and the keeper takes it cleanly.' };
            }
        }

        // Aerial catches
        if (trajectory.elevation >= 16 && trajectory.travelDistance > 18) {
            const deep = trajectory.travelDistance > 42;
            const density = deep ? fieldDensity.deep : fieldDensity.innerRing;
            let catchChance =
                0.05 +
                density * (deep ? 0.22 : 0.18) +
                (contact.type === CONTACT_TYPES.WEAK ? 0.10 : 0) +
                (contact.type === CONTACT_TYPES.EDGE ? 0.08 : 0) +
                ((shot.category === 'power' || shot.category === 'innovative') ? 0.08 : 0) -
                (contact.type === CONTACT_TYPES.SWEET ? 0.12 : 0);

            // Do not convert obvious clears into catches.
            if (trajectory.travelDistance > boundaryLine * 0.98) catchChance *= 0.45;
            catchChance = this.clamp(catchChance, 0.0, 0.62);

            if (Math.random() < catchChance) {
                return {
                    isWicket: true,
                    type: deep ? 'Caught deep' : 'Caught',
                    description: deep ? 'Mistimed in the air and caught in the deep.' : 'Pops up and is safely taken in the ring.'
                };
            }
        }

        return { isWicket: false };
    }

    resolveEdgeOutcome({ trajectory, fieldDensity, zone, delivery }) {
        const outsideOff = this.normalizeLine(delivery?.line) === 'outside_off';
        const fourChance =
            (outsideOff ? 0.20 : 0.12) *
            this.clamp(1 - fieldDensity.offside * 0.85, 0.08, 0.70) *
            this.clamp(trajectory.speed / 26, 0.55, 1.35);

        if (trajectory.travelDistance > 42 && Math.random() < fourChance) {
            return {
                runs: 4,
                wicket: false,
                edge: true,
                dismissal: null,
                description: 'Edge races between keeper and slips for four.'
            };
        }

        const zoneDensity = this.lookup(fieldDensity, zone, fieldDensity.offside);
        const safeRunChance = this.clamp(0.35 + (1 - zoneDensity) * 0.45 + trajectory.travelDistance / 90, 0.10, 0.88);
        const runs = Math.random() < safeRunChance ? 1 : 0;

        return {
            runs: runs,
            wicket: false,
            edge: true,
            dismissal: null,
            description: runs > 0 ? 'Soft edge, safe and they steal a single.' : 'Edge does not carry for a run. Dot ball.'
        };
    }

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------
    getSixProbability({ trajectory, contact, shot, fieldDensity, pitchMods, batter, boundaryLine }) {
        const overBoundary = Math.max(0, trajectory.travelDistance - boundaryLine);
        let chance =
            0.04 +
            overBoundary / 22 +
            (contact.type === CONTACT_TYPES.SWEET ? 0.24 : 0) +
            (contact.type === CONTACT_TYPES.CLEAN ? 0.10 : 0) +
            ((shot.category === 'power' || shot.category === 'innovative') ? 0.12 : 0) -
            fieldDensity.deep * 0.18;

        chance *= pitchMods.boundaryEase;
        if (batter?.signature?.modifiers?.sixDistanceMult) {
            chance *= 1 + (batter.signature.modifiers.sixDistanceMult - 1) * 0.60;
        }
        if (batter?.id === 'gayle') chance += 0.08;
        return this.clamp(chance, 0.02, 0.90);
    }

    getFieldDensity(context, angle, shotCategory) {
        if (typeof this.engine.getFieldDensityModel === 'function') {
            const d = this.engine.getFieldDensityModel(
                angle,
                shotCategory,
                context?.phase,
                context?.pressure
            );
            return { ...DEFAULT_FIELD_DENSITY, ...(d || {}) };
        }

        const presetTable = (typeof FIELD_DENSITY_PRESETS !== 'undefined') ? FIELD_DENSITY_PRESETS : null;
        const difficulty = this.engine?.difficulty || 'medium';
        const preset = presetTable ? (presetTable[difficulty] || presetTable.medium) : null;
        return { ...DEFAULT_FIELD_DENSITY, ...(preset || {}) };
    }

    getShotMatchupProfile(shotId) {
        const table = (typeof SHOT_MATCHUP_PROFILES !== 'undefined') ? SHOT_MATCHUP_PROFILES : null;
        if (!table) return DEFAULT_MATCHUP_PROFILE;
        return table[shotId] || DEFAULT_MATCHUP_PROFILE;
    }

    getShotTrajectoryProfile(shotId) {
        const table = (typeof SHOT_TRAJECTORY_PROFILES !== 'undefined') ? SHOT_TRAJECTORY_PROFILES : null;
        if (!table) return DEFAULT_SHOT_TRAJECTORY_PROFILE;
        return table[shotId] || DEFAULT_SHOT_TRAJECTORY_PROFILE;
    }

    getPitchTrajectoryModifiers(pitch) {
        const table = (typeof PITCH_TRAJECTORY_MODIFIERS !== 'undefined') ? PITCH_TRAJECTORY_MODIFIERS : null;
        const pitchId = pitch?.id || 'batting';
        if (!table) return DEFAULT_PITCH_TRAJECTORY_MODS;
        return table[pitchId] || DEFAULT_PITCH_TRAJECTORY_MODS;
    }

    getDeliveryId(delivery) {
        return delivery?.delivery?.id || delivery?.id || 'stock';
    }

    normalizeLength(raw) {
        const key = String(raw || 'good').toLowerCase().replace(/\s+/g, '_');
        if (key === 'good_length') return 'good';
        return key;
    }

    normalizeLine(raw) {
        const text = String(raw || 'on the stumps').toLowerCase();
        if (text.includes('outside off')) return 'outside_off';
        if (text.includes('outside leg')) return 'outside_leg';
        return 'stumps';
    }

    getMovementMagnitude(delivery) {
        const swing = this.clamp(delivery?.swing || 0, 0, 1.6);
        const bounce = this.clamp(Math.abs((delivery?.bounce || 0.5) - 0.5), 0, 0.5);
        return this.clamp(swing + bounce * 0.7, 0, 1.8);
    }

    resolveEdgeBaseAngle(delivery, grade) {
        const line = this.normalizeLine(delivery?.line);
        if (line === 'outside_off') return this.randomRange(300, 346);
        if (line === 'outside_leg') return this.randomRange(10, 62);
        if (grade === 'very_late' || grade === 'late') return this.randomRange(20, 78);
        return this.randomRange(286, 340);
    }

    getAngleZone(angle) {
        const a = this.normalizeAngle(angle);
        if (a >= 250 && a <= 340) return 'offside';
        if (a >= 90 && a <= 220) return 'legside';
        return 'straight';
    }

    getBoundaryDistance(pitchMods, zone) {
        const zoneFactor = zone === 'straight' ? 0.98 : (zone === 'offside' ? 1.00 : 1.02);
        return 78 * zoneFactor / this.clamp(pitchMods.boundaryEase || 1.0, 0.75, 1.25);
    }

    normalizeProbabilityObject(obj) {
        const keys = Object.keys(obj);
        let total = 0;
        keys.forEach((k) => {
            obj[k] = Math.max(0.001, obj[k]);
            total += obj[k];
        });
        if (total <= 0) {
            const eq = 1 / keys.length;
            keys.forEach((k) => { obj[k] = eq; });
            return;
        }
        keys.forEach((k) => { obj[k] /= total; });
    }

    weightedPick(probMap) {
        let r = Math.random();
        for (const [k, v] of Object.entries(probMap)) {
            r -= v;
            if (r <= 0) return k;
        }
        return Object.keys(probMap)[0];
    }

    lookup(table, key, fallback = 1) {
        if (!table) return fallback;
        if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
        return fallback;
    }

    toRad(deg) {
        return (deg * Math.PI) / 180;
    }

    clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    normalizeAngle(angle) {
        return ((angle % 360) + 360) % 360;
    }

    randomRange(min, max) {
        return min + Math.random() * (max - min);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BattingSystem };
}
