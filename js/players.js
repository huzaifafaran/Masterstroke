// ============================================================
// CRICKET LEGENDS — Player Data & Ability System
// ============================================================
// All 16 iconic players with full attribute sets (0-100) and
// signature abilities with trigger conditions and modifiers.
// ============================================================

const PLAYER_ROLES = {
    BATTER: 'Batter',
    BOWLER: 'Bowler',
    ALL_ROUNDER: 'All-Rounder',
    WICKETKEEPER: 'Wicketkeeper'
};

const BOWLING_STYLE = {
    PACE: 'Pace',
    SPIN_OFF: 'Off Spin',
    SPIN_LEG: 'Leg Spin',
    MEDIUM: 'Medium',
    NONE: 'None'
};

const ABILITY_TRIGGERS = {
    PASSIVE: 'passive',
    SITUATIONAL: 'situational',
    ACTIVATABLE: 'activatable'
};

// ── SIGNATURE ABILITY DEFINITIONS ──────────────────────────

function createAbility(name, trigger, description, conditionFn, modifiers) {
    return { name, trigger, description, condition: conditionFn, modifiers };
}

// ── FULL PLAYER ROSTER ─────────────────────────────────────

const PLAYERS = [
    // ─── BATTERS ───
    {
        id: 'kohli',
        name: 'Virat Kohli',
        country: 'India',
        role: PLAYER_ROLES.BATTER,
        bowlingStyle: BOWLING_STYLE.MEDIUM,
        batting: { timing: 95, shotPlacement: 92, power: 78, footwork: 90, composure: 96 },
        bowling: { paceOrSpin: 45, accuracy: 40, swingOrTurn: 30, variation: 20, control: 45 },
        fielding: { catching: 75, throwPower: 70, throwAccuracy: 72, agility: 80 },
        physical: { stamina: 92, consistency: 95, matchAwareness: 94 },
        isOpener: true,
        identity: {
            orthodoxControl: 96, aerialPower: 64, improvisation: 58, strikeRotation: 97,
            yorkerPunish: 62, shortBallPunish: 72, spinRead: 92, paceRead: 90,
            deathComposure: 97, gapManipulation: 95, legSideWhip: 76, offSidePrecision: 97
        },
        conversionProfile: {
            orthodoxBoundaryBias: 1.10, loftedSixBias: 0.86, aerialCatchSuppression: 1.08, gapTwoBias: 1.18,
            yorkerPunishBias: 0.96, shortBallPunishBias: 1.05, misHitSurvivalBias: 1.08, edgeToFourBias: 1.04
        },
        signatureMatrix: {
            drive: {
                full: { cleanAdd: 0.05, sweetAdd: 0.03, matchupMult: 1.06 },
                outside_off: { cleanAdd: 0.03, matchupMult: 1.03 }
            },
            chase: { cleanAdd: 0.03, sweetAdd: 0.02, matchupMult: 1.04 }
        },
        signature: createAbility(
            'Chase Master', ABILITY_TRIGGERS.SITUATIONAL,
            'Timing +20%, Composure +25 when chasing and RRR > 6.0',
            (ms) => ms.innings === 2 && ms.requiredRunRate > 6.0,
            { timingMult: 1.2, composureAdd: 25, shotPlacementAdd: 10 }
        ),
        aiTendency: { aggression: 0.5, startSlow: true, accelerateAfterBalls: 20, preferredSide: 'offside' }
    },
    {
        id: 'tendulkar',
        name: 'Sachin Tendulkar',
        country: 'India',
        role: PLAYER_ROLES.BATTER,
        bowlingStyle: BOWLING_STYLE.SPIN_OFF,
        batting: { timing: 97, shotPlacement: 95, power: 82, footwork: 93, composure: 90 },
        bowling: { paceOrSpin: 50, accuracy: 55, swingOrTurn: 40, variation: 35, control: 50 },
        fielding: { catching: 70, throwPower: 65, throwAccuracy: 68, agility: 72 },
        physical: { stamina: 88, consistency: 98, matchAwareness: 96 },
        isOpener: true,
        identity: {
            orthodoxControl: 98, aerialPower: 68, improvisation: 52, strikeRotation: 92,
            yorkerPunish: 64, shortBallPunish: 70, spinRead: 95, paceRead: 91,
            deathComposure: 92, gapManipulation: 94, legSideWhip: 74, offSidePrecision: 98
        },
        conversionProfile: {
            orthodoxBoundaryBias: 1.14, loftedSixBias: 0.84, aerialCatchSuppression: 1.06, gapTwoBias: 1.12,
            yorkerPunishBias: 0.95, shortBallPunishBias: 1.04, misHitSurvivalBias: 1.06, edgeToFourBias: 1.03
        },
        signatureMatrix: {
            drive: {
                full: { cleanAdd: 0.06, sweetAdd: 0.02, matchupMult: 1.07 },
                full_driving: { cleanAdd: 0.07, sweetAdd: 0.03, matchupMult: 1.08 }
            },
            cut: { short: { cleanAdd: 0.03, matchupMult: 1.04 } }
        },
        signature: createAbility(
            'Master Blaster Legacy', ABILITY_TRIGGERS.PASSIVE,
            'Consistency floor 95. +10 Timing on difficult pitches.',
            () => true,
            { consistencyFloor: 95, timingAddOnHardPitch: 10 }
        ),
        aiTendency: { aggression: 0.55, startSlow: false, accelerateAfterBalls: 0, preferredSide: 'balanced' }
    },
    {
        id: 'devilliers',
        name: 'AB de Villiers',
        country: 'South Africa',
        role: PLAYER_ROLES.BATTER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 93, shotPlacement: 90, power: 85, footwork: 88, composure: 88 },
        bowling: { paceOrSpin: 20, accuracy: 20, swingOrTurn: 10, variation: 10, control: 20 },
        fielding: { catching: 90, throwPower: 78, throwAccuracy: 80, agility: 92 },
        physical: { stamina: 90, consistency: 88, matchAwareness: 90 },
        identity: {
            orthodoxControl: 88, aerialPower: 86, improvisation: 99, strikeRotation: 86,
            yorkerPunish: 74, shortBallPunish: 78, spinRead: 87, paceRead: 90,
            deathComposure: 89, gapManipulation: 92, legSideWhip: 84, offSidePrecision: 90
        },
        conversionProfile: {
            orthodoxBoundaryBias: 1.02, loftedSixBias: 1.10, aerialCatchSuppression: 1.14, gapTwoBias: 1.04,
            yorkerPunishBias: 1.05, shortBallPunishBias: 1.06, misHitSurvivalBias: 1.12, edgeToFourBias: 1.06
        },
        signatureMatrix: {
            scoop: {
                yorker: { cleanAdd: 0.05, sweetAdd: 0.03, edgeAdd: -0.02, matchupMult: 1.06 }
            },
            switch_hit: {
                spin: { cleanAdd: 0.4, sweetAdd: 0.3, matchupMult: 1.05 }
            },
            chase: { cleanAdd: 0.02, sweetAdd: 0.02, matchupMult: 1.02 }
        },
        signature: createAbility(
            '360° Mastery', ABILITY_TRIGGERS.PASSIVE,
            'Unlock 8 extra shot angles. Innovative shot mistiming -80%.',
            () => true,
            { extraShotAngles: 8, innovativeMistimePenaltyMult: 0.5 }
        ),
        aiTendency: { aggression: 0.7, startSlow: false, accelerateAfterBalls: 0, preferredSide: 'all360' }
    },
    {
        id: 'gayle',
        name: 'Chris Gayle',
        country: 'West Indies',
        role: PLAYER_ROLES.BATTER,
        bowlingStyle: BOWLING_STYLE.SPIN_OFF,
        batting: { timing: 82, shotPlacement: 75, power: 98, footwork: 68, composure: 80 },
        bowling: { paceOrSpin: 50, accuracy: 45, swingOrTurn: 35, variation: 30, control: 42 },
        fielding: { catching: 60, throwPower: 65, throwAccuracy: 60, agility: 55 },
        physical: { stamina: 78, consistency: 72, matchAwareness: 75 },
        isOpener: true,
        identity: {
            orthodoxControl: 70, aerialPower: 99, improvisation: 58, strikeRotation: 62,
            yorkerPunish: 66, shortBallPunish: 84, spinRead: 76, paceRead: 80,
            deathComposure: 82, gapManipulation: 68, legSideWhip: 96, offSidePrecision: 74
        },
        conversionProfile: {
            orthodoxBoundaryBias: 0.96, loftedSixBias: 1.20, aerialCatchSuppression: 1.04, gapTwoBias: 0.90,
            yorkerPunishBias: 1.02, shortBallPunishBias: 1.12, misHitSurvivalBias: 0.98, edgeToFourBias: 1.00
        },
        signatureMatrix: {
            lofted: {
                short: { sweetAdd: 0.05, cleanAdd: 0.03, matchupMult: 1.08 },
                full: { sweetAdd: 0.03, matchupMult: 1.04 }
            },
            pull: { short: { sweetAdd: 0.04, matchupMult: 1.06 } }
        },
        signature: createAbility(
            'Universe Boss', ABILITY_TRIGGERS.SITUATIONAL,
            'After 2 consecutive boundaries: Power +20, six distance +15%.',
            (ms) => ms.consecutiveBoundaries >= 2,
            { powerAdd: 20, sixDistanceMult: 1.15, loftedTimingMult: 1.15 }
        ),
        aiTendency: { aggression: 0.85, startSlow: false, accelerateAfterBalls: 0, preferredSide: 'legside', noSweep: true }
    },
    {
        id: 'afridi',
        name: 'Shahid Afridi',
        country: 'Pakistan',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.SPIN_LEG,
        batting: { timing: 72, shotPlacement: 65, power: 96, footwork: 60, composure: 55 },
        bowling: { paceOrSpin: 78, accuracy: 62, swingOrTurn: 55, variation: 70, control: 58 },
        fielding: { catching: 65, throwPower: 68, throwAccuracy: 65, agility: 70 },
        physical: { stamina: 80, consistency: 45, matchAwareness: 60 },
        identity: {
            orthodoxControl: 52, aerialPower: 98, improvisation: 64, strikeRotation: 44,
            yorkerPunish: 70, shortBallPunish: 78, spinRead: 70, paceRead: 68,
            deathComposure: 58, gapManipulation: 50, legSideWhip: 92, offSidePrecision: 56
        },
        conversionProfile: {
            orthodoxBoundaryBias: 0.82, loftedSixBias: 1.22, aerialCatchSuppression: 0.92, gapTwoBias: 0.80,
            yorkerPunishBias: 1.04, shortBallPunishBias: 1.08, misHitSurvivalBias: 0.88, edgeToFourBias: 0.98
        },
        signatureMatrix: {
            lofted: {
                spin: { sweetAdd: 0.07, edgeAdd: 0.02, missAdd: 0.01, matchupMult: 1.07 },
                yorker: { sweetAdd: 0.03, edgeAdd: 0.04, missAdd: 0.03, matchupMult: 0.98 }
            }
        },
        signature: createAbility(
            'Boom Boom', ABILITY_TRIGGERS.PASSIVE,
            'Power +55, six distance +25%. Defensive timing -15%, Composure -15.',
            () => true,
            { powerAdd: 25, sixDistanceMult: 1.25, defensiveTimingMult: 0.85, composureAdd: -15 }
        ),
        aiTendency: { aggression: 0.9, startSlow: false, accelerateAfterBalls: 0, preferredSide: 'legside', loftedChance: 0.7 }
    },
    {
        id: 'lara',
        name: 'Brian Lara',
        country: 'West Indies',
        role: PLAYER_ROLES.BATTER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 96, shotPlacement: 94, power: 80, footwork: 92, composure: 85 },
        bowling: { paceOrSpin: 15, accuracy: 15, swingOrTurn: 10, variation: 10, control: 15 },
        fielding: { catching: 68, throwPower: 62, throwAccuracy: 65, agility: 70 },
        physical: { stamina: 85, consistency: 88, matchAwareness: 92 },
        isOpener: false,
        signature: createAbility(
            'The Prince', ABILITY_TRIGGERS.SITUATIONAL,
            'After 30+ runs: Shot Placement +20, Timing +15, Footwork +10.',
            (ms) => ms.currentBatterRuns >= 30,
            { shotPlacementAdd: 20, timingAdd: 15, footworkAdd: 10 }
        ),
        aiTendency: { aggression: 0.6, startSlow: true, accelerateAfterBalls: 25, preferredSide: 'offside' }
    },

    // ─── BOWLERS ───
    {
        id: 'malinga',
        name: 'Lasith Malinga',
        country: 'Sri Lanka',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 30, shotPlacement: 25, power: 45, footwork: 20, composure: 40 },
        bowling: { paceOrSpin: 88, accuracy: 85, swingOrTurn: 72, variation: 90, control: 82 },
        fielding: { catching: 50, throwPower: 55, throwAccuracy: 55, agility: 55 },
        physical: { stamina: 78, consistency: 80, matchAwareness: 82 },
        signature: createAbility(
            'Death Over Specialist', ABILITY_TRIGGERS.SITUATIONAL,
            'Overs 16-20: Yorker accuracy +30, Slower ball disguise +40%.',
            (ms) => ms.currentOver >= 16,
            { yorkerAccuracyAdd: 30, slowerBallDisguiseMult: 1.4 }
        ),
        aiTendency: { deathOverYorkerChance: 0.7, bouncerChance: 0.15, slowerBallChance: 0.25 }
    },
    {
        id: 'akram',
        name: 'Wasim Akram',
        country: 'Pakistan',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 55, shotPlacement: 45, power: 60, footwork: 50, composure: 55 },
        bowling: { paceOrSpin: 2, accuracy: 8, swingOrTurn: 9, variation: 8, control: 9 },
        fielding: { catching: 55, throwPower: 60, throwAccuracy: 60, agility: 60 },
        physical: { stamina: 85, consistency: 90, matchAwareness: 90 },
        signature: createAbility(
            'Sultan of Swing', ABILITY_TRIGGERS.PASSIVE,
            'Swing +25. Reverse swing unlocks at ball age 25 (vs 40).',
            () => true,
            { swingAdd: 25, reverseSwingThreshold: 25 }
        ),
        aiTendency: { swingSetupOvers: true, yorkerChance: 0.3, bouncerChance: 0.2 }
    },
    {
        id: 'murali',
        name: 'Muttiah Muralitharan',
        country: 'Sri Lanka',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.SPIN_OFF,
        batting: { timing: 20, shotPlacement: 15, power: 25, footwork: 15, composure: 30 },
        bowling: { paceOrSpin: 95, accuracy: 90, swingOrTurn: 98, variation: 96, control: 88 },
        fielding: { catching: 55, throwPower: 50, throwAccuracy: 52, agility: 55 },
        physical: { stamina: 92, consistency: 92, matchAwareness: 88 },
        signature: createAbility(
            'Spin Wizard', ABILITY_TRIGGERS.PASSIVE,
            'Turn +20, Variation disguise +35%. Batter read success -30%.',
            () => true,
            { turnAdd: 20, variationDisguiseMult: 1.35, batterReadMult: 0.7 }
        ),
        aiTendency: { doosraFrequency: 0.25, flightedChance: 0.3, armBallChance: 0.15 }
    },
    {
        id: 'warne',
        name: 'Shane Warne',
        country: 'Australia',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.SPIN_LEG,
        batting: { timing: 45, shotPlacement: 40, power: 50, footwork: 40, composure: 55 },
        bowling: { paceOrSpin: 90, accuracy: 86, swingOrTurn: 92, variation: 94, control: 92 },
        fielding: { catching: 65, throwPower: 58, throwAccuracy: 60, agility: 62 },
        physical: { stamina: 82, consistency: 90, matchAwareness: 94 },
        signature: createAbility(
            'Leg Spin Sorcery', ABILITY_TRIGGERS.PASSIVE,
            'Leg spin turn +15, Air drift +25%. Googly accuracy +20.',
            () => true,
            { turnAdd: 15, airDriftMult: 1.25, googlyAccuracyAdd: 20 }
        ),
        aiTendency: { googlyFrequency: 0.2, flipperChance: 0.1, flightedChance: 0.35 }
    },
    {
        id: 'steyn',
        name: 'Dale Steyn',
        country: 'South Africa',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 35, shotPlacement: 30, power: 40, footwork: 30, composure: 45 },
        bowling: { paceOrSpin: 96, accuracy: 90, swingOrTurn: 88, variation: 82, control: 88 },
        fielding: { catching: 60, throwPower: 62, throwAccuracy: 65, agility: 68 },
        physical: { stamina: 90, consistency: 88, matchAwareness: 95 },
        signature: createAbility(
            'Express Pace', ABILITY_TRIGGERS.SITUATIONAL,
            'First 5 overs: Pace +10, Swing +15. Opposing batter Composure -10.',
            (ms) => ms.currentOver < 5,
            { paceAdd: 10, swingAdd: 15, batterComposurePenalty: -10 }
        ),
        aiTendency: { newBallAggression: 0.9, bouncerChance: 0.3, yorkerChance: 0.2 }
    },

    // ─── ALL-ROUNDERS ───
    {
        id: 'kallis',
        name: 'Jacques Kallis',
        country: 'South Africa',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 88, shotPlacement: 85, power: 82, footwork: 84, composure: 90 },
        bowling: { paceOrSpin: 82, accuracy: 80, swingOrTurn: 78, variation: 72, control: 84 },
        fielding: { catching: 85, throwPower: 78, throwAccuracy: 80, agility: 75 },
        physical: { stamina: 95, consistency: 94, matchAwareness: 92 },
        signature: createAbility(
            'The Complete Cricketer', ABILITY_TRIGGERS.PASSIVE,
            'No stat below 55. Stamina drain -30%.',
            () => true,
            { attributeFloor: 55, staminaDrainMult: 0.7 }
        ),
        aiTendency: { aggression: 0.45, startSlow: true, accelerateAfterBalls: 30, preferredSide: 'balanced' }
    },
    {
        id: 'shakib',
        name: 'Shakib Al Hasan',
        country: 'Bangladesh',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.SPIN_OFF,
        batting: { timing: 82, shotPlacement: 78, power: 72, footwork: 78, composure: 82 },
        bowling: { paceOrSpin: 80, accuracy: 82, swingOrTurn: 80, variation: 78, control: 80 },
        fielding: { catching: 72, throwPower: 68, throwAccuracy: 70, agility: 75 },
        physical: { stamina: 88, consistency: 85, matchAwareness: 85 },
        signature: createAbility(
            'All-Phase Dominance', ABILITY_TRIGGERS.SITUATIONAL,
            'When team needs >50 runs or >3 wickets: best discipline +10.',
            (ms) => ms.runsNeeded > 50 || ms.wicketsNeeded > 3,
            { contextualBoost: 10 }
        ),
        aiTendency: { aggression: 0.55, startSlow: false, preferredSide: 'balanced' }
    },

    // ─── WICKETKEEPERS ───
    {
        id: 'dhoni',
        name: 'MS Dhoni',
        country: 'India',
        role: PLAYER_ROLES.WICKETKEEPER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 88, shotPlacement: 82, power: 90, footwork: 80, composure: 99 },
        bowling: { paceOrSpin: 10, accuracy: 10, swingOrTurn: 5, variation: 5, control: 10 },
        fielding: { catching: 92, throwPower: 85, throwAccuracy: 88, agility: 78 },
        physical: { stamina: 90, consistency: 85, matchAwareness: 95 },
        identity: {
            orthodoxControl: 86, aerialPower: 90, improvisation: 82, strikeRotation: 80,
            yorkerPunish: 96, shortBallPunish: 70, spinRead: 88, paceRead: 90,
            deathComposure: 99, gapManipulation: 84, legSideWhip: 94, offSidePrecision: 82
        },
        conversionProfile: {
            orthodoxBoundaryBias: 1.00, loftedSixBias: 1.10, aerialCatchSuppression: 1.10, gapTwoBias: 1.02,
            yorkerPunishBias: 1.16, shortBallPunishBias: 1.00, misHitSurvivalBias: 1.14, edgeToFourBias: 1.02
        },
        signatureMatrix: {
            lofted: { yorker: { sweetAdd: 0.06, cleanAdd: 0.03, matchupMult: 1.09 } },
            scoop: { yorker: { sweetAdd: 0.04, cleanAdd: 0.03, matchupMult: 1.07 } },
            chase: { cleanAdd: 0.02, sweetAdd: 0.02, matchupMult: 1.03 }
        },
        signature: createAbility(
            'Captain Cool', ABILITY_TRIGGERS.ACTIVATABLE,
            'Helicopter Shot (1/innings): +40 Power on yorkers. Immune to pressure.',
            (ms) => !ms.helicopterUsed,
            { helicopterPowerAdd: 40, pressureImmunity: true, teamPressureReduction: 0.05 }
        ),
        aiTendency: { aggression: 0.4, startSlow: true, accelerateAfterBalls: 25, finisherMode: true, preferredSide: 'legside' }
    },
    {
        id: 'sangakkara',
        name: 'Kumar Sangakkara',
        country: 'Sri Lanka',
        role: PLAYER_ROLES.WICKETKEEPER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 92, shotPlacement: 90, power: 76, footwork: 88, composure: 92 },
        bowling: { paceOrSpin: 10, accuracy: 10, swingOrTurn: 5, variation: 5, control: 10 },
        fielding: { catching: 88, throwPower: 72, throwAccuracy: 78, agility: 80 },
        physical: { stamina: 88, consistency: 92, matchAwareness: 93 },
        signature: createAbility(
            'Elegant Accumulator', ABILITY_TRIGGERS.PASSIVE,
            'Run speed +15%. Strike rotation gap accuracy +20%.',
            () => true,
            { runSpeedMult: 1.15, gapAccuracyAdd: 20 }
        ),
        aiTendency: { aggression: 0.5, startSlow: false, rotateStrike: true, preferredSide: 'balanced' }
    },

    // --- MODERN ERA ADDITIONS (balanced: only select players get elite signatures) ---
    {
        id: 'banton',
        name: 'Tom Banton',
        country: 'England',
        role: PLAYER_ROLES.BATTER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 78, shotPlacement: 76, power: 84, footwork: 79, composure: 70 },
        bowling: { paceOrSpin: 8, accuracy: 8, swingOrTurn: 6, variation: 8, control: 8 },
        fielding: { catching: 72, throwPower: 68, throwAccuracy: 66, agility: 79 },
        physical: { stamina: 82, consistency: 72, matchAwareness: 74 },
        isOpener: true,
        signature: null,
        aiTendency: { aggression: 0.76, startSlow: false, accelerateAfterBalls: 0, preferredSide: 'offside', loftedChance: 0.28 }
    },
    {
        id: 'holder',
        name: 'Jason Holder',
        country: 'West Indies',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.MEDIUM,
        batting: { timing: 74, shotPlacement: 70, power: 78, footwork: 72, composure: 80 },
        bowling: { paceOrSpin: 82, accuracy: 80, swingOrTurn: 76, variation: 74, control: 82 },
        fielding: { catching: 83, throwPower: 78, throwAccuracy: 76, agility: 72 },
        physical: { stamina: 92, consistency: 80, matchAwareness: 84 },
        isOpener: false,
        signature: createAbility(
            'Tall Utility Spells', ABILITY_TRIGGERS.SITUATIONAL,
            'Mild control boost in middle overs.',
            (ms) => ms.currentOver >= 5 && ms.currentOver <= 14,
            { contextualBoost: 6 }
        ),
        aiTendency: { aggression: 0.48, startSlow: true, accelerateAfterBalls: 25, preferredSide: 'balanced', slowerBallChance: 0.28 }
    },
    {
        id: 'amir',
        name: 'Muhammad Amir',
        country: 'Pakistan',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 34, shotPlacement: 30, power: 44, footwork: 32, composure: 52 },
        bowling: { paceOrSpin: 86, accuracy: 86, swingOrTurn: 94, variation: 82, control: 88 },
        fielding: { catching: 66, throwPower: 72, throwAccuracy: 70, agility: 68 },
        physical: { stamina: 84, consistency: 84, matchAwareness: 86 },
        // Major unique effect justified: elite new-ball swing profile.
        signature: createAbility(
            'New Ball Swing Assassin', ABILITY_TRIGGERS.SITUATIONAL,
            'First 4 overs: swing and control spike.',
            (ms) => ms.currentOver < 4,
            { swingAdd: 22, contextualBoost: 12 }
        ),
        aiTendency: { swingSetupOvers: true, yorkerChance: 0.22, bouncerChance: 0.15, slowerBallChance: 0.20 }
    },
    {
        id: 'bumrah',
        name: 'Jasprit Bumrah',
        country: 'India',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 24, shotPlacement: 20, power: 34, footwork: 20, composure: 45 },
        bowling: { paceOrSpin: 95, accuracy: 95, swingOrTurn: 88, variation: 94, control: 96 },
        fielding: { catching: 72, throwPower: 76, throwAccuracy: 78, agility: 74 },
        physical: { stamina: 90, consistency: 94, matchAwareness: 95 },
        identity: {
            orthodoxControl: 24, aerialPower: 26, improvisation: 20, strikeRotation: 30,
            yorkerPunish: 22, shortBallPunish: 24, spinRead: 28, paceRead: 26,
            deathComposure: 64, gapManipulation: 24, legSideWhip: 28, offSidePrecision: 24
        },
        conversionProfile: {
            orthodoxBoundaryBias: 0.82, loftedSixBias: 0.72, aerialCatchSuppression: 0.94, gapTwoBias: 0.86,
            yorkerPunishBias: 0.84, shortBallPunishBias: 0.86, misHitSurvivalBias: 0.92, edgeToFourBias: 0.90
        },
        // Major unique effect justified: elite death-overs yorker execution.
        signature: createAbility(
            'Death Overs Precision', ABILITY_TRIGGERS.SITUATIONAL,
            'Final overs: yorker accuracy and control surge.',
            (ms) => ms.currentOver >= Math.max(0, ms.totalOvers - 3),
            { yorkerAccuracyAdd: 28, paceAdd: 8, contextualBoost: 10 }
        ),
        aiTendency: { deathOverYorkerChance: 0.82, yorkerChance: 0.62, slowerBallChance: 0.22, bouncerChance: 0.16 }
    },
    {
        id: 'samson',
        name: 'Sanju Samson',
        country: 'India',
        role: PLAYER_ROLES.WICKETKEEPER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 84, shotPlacement: 84, power: 86, footwork: 82, composure: 78 },
        bowling: { paceOrSpin: 8, accuracy: 8, swingOrTurn: 5, variation: 5, control: 8 },
        fielding: { catching: 84, throwPower: 74, throwAccuracy: 78, agility: 82 },
        physical: { stamina: 84, consistency: 76, matchAwareness: 78 },
        isOpener: true,
        signature: createAbility(
            'Powerplay Intent', ABILITY_TRIGGERS.SITUATIONAL,
            'Slight attacking edge in first 2 overs.',
            (ms) => ms.currentOver < 2,
            { timingAdd: 5, powerAdd: 6 }
        ),
        aiTendency: { aggression: 0.72, startSlow: false, accelerateAfterBalls: 8, preferredSide: 'offside', loftedChance: 0.30 }
    },
    {
        id: 'sarfaraz',
        name: 'Muhammad Sarfaraz',
        country: 'Pakistan',
        role: PLAYER_ROLES.WICKETKEEPER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 76, shotPlacement: 80, power: 64, footwork: 74, composure: 82 },
        bowling: { paceOrSpin: 8, accuracy: 8, swingOrTurn: 6, variation: 5, control: 8 },
        fielding: { catching: 86, throwPower: 70, throwAccuracy: 80, agility: 78 },
        physical: { stamina: 82, consistency: 78, matchAwareness: 84 },
        signature: null,
        aiTendency: { aggression: 0.44, startSlow: true, rotateStrike: true, accelerateAfterBalls: 24, preferredSide: 'balanced' }
    },
    {
        id: 'chris_green',
        name: 'Chris Green',
        country: 'Australia',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.SPIN_OFF,
        batting: { timing: 46, shotPlacement: 44, power: 48, footwork: 45, composure: 62 },
        bowling: { paceOrSpin: 76, accuracy: 86, swingOrTurn: 80, variation: 78, control: 88 },
        fielding: { catching: 70, throwPower: 66, throwAccuracy: 68, agility: 70 },
        physical: { stamina: 84, consistency: 82, matchAwareness: 82 },
        signature: null,
        aiTendency: { flightedChance: 0.20, armBallChance: 0.20, doosraFrequency: 0.15, aggression: 0.28 }
    },
    {
        id: 'zaman_khan',
        name: 'Zaman Khan',
        country: 'Pakistan',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 30, shotPlacement: 26, power: 40, footwork: 28, composure: 48 },
        bowling: { paceOrSpin: 88, accuracy: 78, swingOrTurn: 74, variation: 88, control: 76 },
        fielding: { catching: 62, throwPower: 72, throwAccuracy: 70, agility: 74 },
        physical: { stamina: 86, consistency: 74, matchAwareness: 76 },
        signature: null,
        aiTendency: { deathOverYorkerChance: 0.66, yorkerChance: 0.54, slowerBallChance: 0.34, bouncerChance: 0.14 }
    },
    {
        id: 'finn_allen',
        name: 'Finn Allen',
        country: 'New Zealand',
        role: PLAYER_ROLES.BATTER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 76, shotPlacement: 72, power: 90, footwork: 74, composure: 66 },
        bowling: { paceOrSpin: 8, accuracy: 8, swingOrTurn: 5, variation: 5, control: 8 },
        fielding: { catching: 72, throwPower: 70, throwAccuracy: 68, agility: 78 },
        physical: { stamina: 84, consistency: 68, matchAwareness: 72 },
        isOpener: true,
        signature: null,
        aiTendency: { aggression: 0.84, startSlow: false, accelerateAfterBalls: 0, preferredSide: 'legside', loftedChance: 0.36 }
    },
    {
        id: 'seifert',
        name: 'Tim Seifert',
        country: 'New Zealand',
        role: PLAYER_ROLES.WICKETKEEPER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 78, shotPlacement: 74, power: 82, footwork: 76, composure: 70 },
        bowling: { paceOrSpin: 8, accuracy: 8, swingOrTurn: 5, variation: 5, control: 8 },
        fielding: { catching: 82, throwPower: 72, throwAccuracy: 76, agility: 80 },
        physical: { stamina: 82, consistency: 72, matchAwareness: 74 },
        isOpener: true,
        signature: null,
        aiTendency: { aggression: 0.68, startSlow: false, accelerateAfterBalls: 10, preferredSide: 'balanced', loftedChance: 0.24 }
    },
    {
        id: 'ferguson',
        name: 'Lockie Ferguson',
        country: 'New Zealand',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 28, shotPlacement: 24, power: 42, footwork: 26, composure: 46 },
        bowling: { paceOrSpin: 96, accuracy: 76, swingOrTurn: 72, variation: 82, control: 74 },
        fielding: { catching: 64, throwPower: 80, throwAccuracy: 74, agility: 72 },
        physical: { stamina: 86, consistency: 72, matchAwareness: 76 },
        signature: null,
        aiTendency: { bouncerChance: 0.36, yorkerChance: 0.28, slowerBallChance: 0.18, newBallAggression: 0.82 }
    },
    {
        id: 'shadab',
        name: 'Shadab Khan',
        country: 'Pakistan',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.SPIN_LEG,
        batting: { timing: 76, shotPlacement: 74, power: 78, footwork: 78, composure: 76 },
        bowling: { paceOrSpin: 84, accuracy: 82, swingOrTurn: 86, variation: 88, control: 84 },
        fielding: { catching: 86, throwPower: 80, throwAccuracy: 82, agility: 88 },
        physical: { stamina: 88, consistency: 80, matchAwareness: 84 },
        // Major unique effect justified: deceptive leg-spin + pressure utility.
        signature: createAbility(
            'Deceptive Leg-Spin Engine', ABILITY_TRIGGERS.SITUATIONAL,
            'Under pressure, gains turn and control.',
            (ms) => ms.pressure > 0.45 || ms.currentOver >= Math.max(0, ms.totalOvers - 4),
            { turnAdd: 14, contextualBoost: 10 }
        ),
        aiTendency: { aggression: 0.58, rotateStrike: true, googlyFrequency: 0.26, flightedChance: 0.24, loftedChance: 0.18 }
    },
    {
        id: 'zampa',
        name: 'Adam Zampa',
        country: 'Australia',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.SPIN_LEG,
        batting: { timing: 34, shotPlacement: 30, power: 42, footwork: 34, composure: 52 },
        bowling: { paceOrSpin: 86, accuracy: 84, swingOrTurn: 90, variation: 92, control: 86 },
        fielding: { catching: 70, throwPower: 68, throwAccuracy: 70, agility: 74 },
        physical: { stamina: 84, consistency: 84, matchAwareness: 86 },
        // Major unique effect justified: elite leg-spin deception package.
        signature: createAbility(
            'Googly Trap', ABILITY_TRIGGERS.PASSIVE,
            'Leg-spin deception boosted all innings.',
            () => true,
            { turnAdd: 12, googlyAccuracyAdd: 18 }
        ),
        aiTendency: { googlyFrequency: 0.32, flipperChance: 0.14, flightedChance: 0.28, aggression: 0.30 }
    },
    {
        id: 'pollard',
        name: 'Kieron Pollard',
        country: 'West Indies',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.MEDIUM,
        batting: { timing: 80, shotPlacement: 74, power: 98, footwork: 70, composure: 84 },
        bowling: { paceOrSpin: 72, accuracy: 70, swingOrTurn: 62, variation: 70, control: 70 },
        fielding: { catching: 84, throwPower: 90, throwAccuracy: 82, agility: 76 },
        physical: { stamina: 86, consistency: 74, matchAwareness: 82 },
        identity: {
            orthodoxControl: 66, aerialPower: 97, improvisation: 72, strikeRotation: 64,
            yorkerPunish: 80, shortBallPunish: 84, spinRead: 76, paceRead: 78,
            deathComposure: 90, gapManipulation: 72, legSideWhip: 96, offSidePrecision: 70
        },
        conversionProfile: {
            orthodoxBoundaryBias: 0.95, loftedSixBias: 1.18, aerialCatchSuppression: 1.02, gapTwoBias: 0.92,
            yorkerPunishBias: 1.10, shortBallPunishBias: 1.10, misHitSurvivalBias: 1.00, edgeToFourBias: 1.01
        },
        signatureMatrix: {
            lofted: {
                yorker: { cleanAdd: 0.03, sweetAdd: 0.04, matchupMult: 1.04 },
                short: { cleanAdd: 0.04, sweetAdd: 0.05, matchupMult: 1.08 }
            },
            pull: { short: { sweetAdd: 0.04, matchupMult: 1.06 } },
            chase: { sweetAdd: 0.02, matchupMult: 1.02 }
        },
        // Major unique effect justified: elite death-over hitting profile.
        signature: createAbility(
            'Death-Over Demolisher', ABILITY_TRIGGERS.SITUATIONAL,
            'Finishing phase power and six conversion spike.',
            (ms) => ms.currentOver >= Math.max(0, ms.totalOvers - 4),
            { powerAdd: 20, sixDistanceMult: 1.20, loftedTimingMult: 1.12 }
        ),
        aiTendency: { aggression: 0.82, finisherMode: true, loftedChance: 0.46, preferredSide: 'legside', slowerBallChance: 0.20 }
    },
    {
        id: 'umar_gul',
        name: 'Umar Gul',
        country: 'Pakistan',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 28, shotPlacement: 24, power: 40, footwork: 24, composure: 48 },
        bowling: { paceOrSpin: 90, accuracy: 88, swingOrTurn: 80, variation: 92, control: 88 },
        fielding: { catching: 60, throwPower: 72, throwAccuracy: 68, agility: 66 },
        physical: { stamina: 84, consistency: 86, matchAwareness: 88 },
        identity: {
            orthodoxControl: 28, aerialPower: 30, improvisation: 24, strikeRotation: 34,
            yorkerPunish: 26, shortBallPunish: 30, spinRead: 34, paceRead: 34,
            deathComposure: 68, gapManipulation: 28, legSideWhip: 34, offSidePrecision: 30
        },
        conversionProfile: {
            orthodoxBoundaryBias: 0.84, loftedSixBias: 0.76, aerialCatchSuppression: 0.96, gapTwoBias: 0.88,
            yorkerPunishBias: 0.86, shortBallPunishBias: 0.88, misHitSurvivalBias: 0.94, edgeToFourBias: 0.92
        },
        // Major unique effect justified: classic death overs wicket specialist.
        signature: createAbility(
            'Death Wicket Hunter', ABILITY_TRIGGERS.SITUATIONAL,
            'Late overs: yorkers and variation become lethal.',
            (ms) => ms.currentOver >= Math.max(0, ms.totalOvers - 4),
            { yorkerAccuracyAdd: 24, contextualBoost: 12 }
        ),
        aiTendency: { deathOverYorkerChance: 0.74, yorkerChance: 0.58, slowerBallChance: 0.38, bouncerChance: 0.18 }
    },
    {
        id: 'lendl_simmons',
        name: 'Lendl Simmons',
        country: 'West Indies',
        role: PLAYER_ROLES.BATTER,
        bowlingStyle: BOWLING_STYLE.MEDIUM,
        batting: { timing: 80, shotPlacement: 80, power: 78, footwork: 76, composure: 78 },
        bowling: { paceOrSpin: 48, accuracy: 42, swingOrTurn: 34, variation: 38, control: 44 },
        fielding: { catching: 72, throwPower: 70, throwAccuracy: 70, agility: 74 },
        physical: { stamina: 84, consistency: 76, matchAwareness: 78 },
        signature: null,
        aiTendency: { aggression: 0.58, startSlow: false, accelerateAfterBalls: 14, preferredSide: 'balanced', rotateStrike: true }
    },
    {
        id: 'marco_jansen',
        name: 'Marco Jansen',
        country: 'South Africa',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 66, shotPlacement: 62, power: 72, footwork: 64, composure: 70 },
        bowling: { paceOrSpin: 88, accuracy: 78, swingOrTurn: 82, variation: 76, control: 80 },
        fielding: { catching: 74, throwPower: 78, throwAccuracy: 74, agility: 70 },
        physical: { stamina: 90, consistency: 76, matchAwareness: 78 },
        isOpener: true,
        signature: createAbility(
            'Hit-the-Deck Bounce', ABILITY_TRIGGERS.SITUATIONAL,
            'Pace utility rises slightly in first spell.',
            (ms) => ms.currentOver < 6,
            { paceAdd: 6, contextualBoost: 4 }
        ),
        aiTendency: { newBallAggression: 0.70, bouncerChance: 0.28, yorkerChance: 0.22, slowerBallChance: 0.16 }
    },

    // --- NEW ROSTER ADDITIONS (20 More Players, Skipping Repeats) ---
    {
        id: 'hassan_ali',
        name: 'Hassan Ali',
        country: 'Pakistan',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 42, shotPlacement: 35, power: 65, footwork: 38, composure: 50 },
        bowling: { paceOrSpin: 85, accuracy: 82, swingOrTurn: 78, variation: 88, control: 80 },
        fielding: { catching: 68, throwPower: 75, throwAccuracy: 72, agility: 75 },
        physical: { stamina: 85, consistency: 78, matchAwareness: 82 },
        signature: createAbility(
            'The Generator', ABILITY_TRIGGERS.SITUATIONAL,
            'Middle overs wicket-taking boost.',
            (ms) => ms.currentOver >= 6 && ms.currentOver <= 15,
            { contextualBoost: 15, yorkerAccuracyAdd: 10 }
        ),
        aiTendency: { slowerBallChance: 0.35, yorkerChance: 0.25, bouncerChance: 0.15 }
    },
    {
        id: 'rohit',
        name: 'Rohit Sharma',
        country: 'India',
        role: PLAYER_ROLES.BATTER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 94, shotPlacement: 92, power: 88, footwork: 84, composure: 92 },
        bowling: { paceOrSpin: 15, accuracy: 15, swingOrTurn: 10, variation: 10, control: 15 },
        fielding: { catching: 80, throwPower: 70, throwAccuracy: 72, agility: 68 },
        physical: { stamina: 84, consistency: 90, matchAwareness: 94 },
        isOpener: true,
        identity: {
            shortBallPunish: 98, offSidePrecision: 92, legSideWhip: 88, gapManipulation: 92
        },
        signature: createAbility(
            'Hitman Timing', ABILITY_TRIGGERS.SITUATIONAL,
            '+15% Power on pulls/hooks. Minimal feet movement penalty -50%.',
            (ms) => true,
            { pullPowerMult: 1.15, footworkPenaltyMult: 0.5 }
        ),
        aiTendency: { aggression: 0.7, pullShotPreference: 0.8, prefersPace: true }
    },
    {
        id: 'smith',
        name: 'Steven Smith',
        country: 'Australia',
        role: PLAYER_ROLES.BATTER,
        bowlingStyle: BOWLING_STYLE.SPIN_LEG,
        batting: { timing: 92, shotPlacement: 95, power: 72, footwork: 98, composure: 95 },
        bowling: { paceOrSpin: 45, accuracy: 40, swingOrTurn: 55, variation: 45, control: 40 },
        fielding: { catching: 88, throwPower: 68, throwAccuracy: 75, agility: 82 },
        physical: { stamina: 94, consistency: 96, matchAwareness: 98 },
        signature: createAbility(
            'Unorthodox Genius', ABILITY_TRIGGERS.PASSIVE,
            'Innovative shot risk -25%. Spin read +15%.',
            () => true,
            { innovativeRiskMult: 0.75, spinReadAdd: 15 }
        ),
        aiTendency: { shuffleAcross: true, aggression: 0.5, rotateStrike: true }
    },
    {
        id: 'd_mitchell',
        name: 'Daryll Mitchell',
        country: 'New Zealand',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.MEDIUM,
        batting: { timing: 85, shotPlacement: 80, power: 82, footwork: 82, composure: 88 },
        bowling: { paceOrSpin: 72, accuracy: 78, swingOrTurn: 65, variation: 70, control: 75 },
        fielding: { catching: 82, throwPower: 74, throwAccuracy: 76, agility: 72 },
        physical: { stamina: 90, consistency: 88, matchAwareness: 90 },
        signature: null,
        aiTendency: { aggression: 0.6, straightHitPreference: 0.7 }
    },
    {
        id: 'santner',
        name: 'Mitchell Santner',
        country: 'New Zealand',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.SPIN_OFF,
        batting: { timing: 74, shotPlacement: 78, power: 68, footwork: 76, composure: 84 },
        bowling: { paceOrSpin: 78, accuracy: 92, swingOrTurn: 85, variation: 75, control: 94 },
        fielding: { catching: 86, throwPower: 78, throwAccuracy: 88, agility: 84 },
        physical: { stamina: 88, consistency: 92, matchAwareness: 92 },
        signature: createAbility(
            'Economy King', ABILITY_TRIGGERS.PASSIVE,
            'Control +15, Economy focus.',
            () => true,
            { controlAdd: 15, buildPressure: 0.1 }
        ),
        aiTendency: { flatTrajectory: 0.7, armBallFrequency: 0.3 }
    },
    {
        id: 'hardik',
        name: 'Hardik Pandya',
        country: 'India',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 84, shotPlacement: 78, power: 92, footwork: 80, composure: 86 },
        bowling: { paceOrSpin: 86, accuracy: 78, swingOrTurn: 72, variation: 80, control: 78 },
        fielding: { catching: 84, throwPower: 88, throwAccuracy: 82, agility: 86 },
        physical: { stamina: 88, consistency: 78, matchAwareness: 88 },
        signature: createAbility(
            'Kung-Fu Pandya', ABILITY_TRIGGERS.SITUATIONAL,
            'Final 5 overs: Power +15, Timing +10.',
            (ms) => ms.currentOver >= Math.max(0, ms.totalOvers - 5),
            { powerAdd: 15, timingAdd: 10 }
        ),
        aiTendency: { aggression: 0.8, finisherMode: true, bouncerChance: 0.3 }
    },
    {
        id: 'russell',
        name: 'Andre Russell',
        country: 'West Indies',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 78, shotPlacement: 70, power: 99, footwork: 72, composure: 78 },
        bowling: { paceOrSpin: 90, accuracy: 74, swingOrTurn: 60, variation: 82, control: 72 },
        fielding: { catching: 78, throwPower: 92, throwAccuracy: 78, agility: 75 },
        physical: { stamina: 82, consistency: 68, matchAwareness: 80 },
        signature: createAbility(
            'Dre Russ Muscle', ABILITY_TRIGGERS.PASSIVE,
            'Power +30, Mis-hit six conversion +20%.',
            () => true,
            { powerAdd: 30, misHitSixBias: 1.2 }
        ),
        aiTendency: { aggression: 0.95, finisherMode: true, loftedChance: 0.6 }
    },
    {
        id: 'pooran',
        name: 'Nicholas Pooran',
        country: 'West Indies',
        role: PLAYER_ROLES.WICKETKEEPER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 86, shotPlacement: 84, power: 90, footwork: 86, composure: 78 },
        bowling: { paceOrSpin: 10, accuracy: 10, swingOrTurn: 15, variation: 15, control: 10 },
        fielding: { catching: 82, throwPower: 78, throwAccuracy: 75, agility: 88 },
        physical: { stamina: 92, consistency: 94, matchAwareness: 98 },
        isOpener: false,
        signature: null,
        aiTendency: { aggression: 0.65, preferredSide: 'offside', loftedChance: 0.4 }
    },
    {
        id: 'roy',
        name: 'Jason Roy',
        country: 'England',
        role: PLAYER_ROLES.BATTER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 82, shotPlacement: 78, power: 88, footwork: 78, composure: 72 },
        bowling: { paceOrSpin: 10, accuracy: 10, swingOrTurn: 10, variation: 10, control: 10 },
        fielding: { catching: 74, throwPower: 82, throwAccuracy: 76, agility: 78 },
        physical: { stamina: 82, consistency: 78, matchAwareness: 82 },
        isOpener: true,
        signature: null,
        aiTendency: { aggression: 0.95, preferredSide: 'straight' }
    },
    {
        id: 'henry',
        name: 'Matt Henry',
        country: 'New Zealand',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 35, shotPlacement: 30, power: 45, footwork: 32, composure: 55 },
        bowling: { paceOrSpin: 88, accuracy: 88, swingOrTurn: 85, variation: 78, control: 86 },
        fielding: { catching: 65, throwPower: 72, throwAccuracy: 70, agility: 68 },
        physical: { stamina: 86, consistency: 84, matchAwareness: 84 },
        signature: null,
        aiTendency: { newBallAggression: 0.8, swingSetupOvers: true }
    },
    {
        id: 'hetmyer',
        name: 'Shimron Hetmyer',
        country: 'West Indies',
        role: PLAYER_ROLES.BATTER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 80, shotPlacement: 76, power: 88, footwork: 78, composure: 75 },
        bowling: { paceOrSpin: 5, accuracy: 5, swingOrTurn: 5, variation: 5, control: 5 },
        fielding: { catching: 72, throwPower: 70, throwAccuracy: 68, agility: 78 },
        physical: { stamina: 82, consistency: 72, matchAwareness: 74 },
        signature: null,
        aiTendency: { aggression: 0.8, preferredSide: 'legside' }
    },
    {
        id: 'rutherford',
        name: 'Sherfane Rutherford',
        country: 'West Indies',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.MEDIUM,
        batting: { timing: 76, shotPlacement: 72, power: 86, footwork: 74, composure: 82 },
        bowling: { paceOrSpin: 70, accuracy: 72, swingOrTurn: 60, variation: 75, control: 72 },
        fielding: { catching: 78, throwPower: 75, throwAccuracy: 72, agility: 75 },
        physical: { stamina: 84, consistency: 76, matchAwareness: 84 },
        signature: createAbility(
            'Calm Finisher', ABILITY_TRIGGERS.SITUATIONAL,
            'Runs needed < 30: Composure +20, Power +10.',
            (ms) => ms.runsNeeded > 0 && ms.runsNeeded <= 30,
            { composureAdd: 20, powerAdd: 10 }
        ),
        aiTendency: { aggression: 0.75, finisherMode: true }
    },
    {
        id: 'dube',
        name: 'Shivam Dube',
        country: 'India',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.MEDIUM,
        batting: { timing: 78, shotPlacement: 74, power: 94, footwork: 68, composure: 80 },
        bowling: { paceOrSpin: 68, accuracy: 65, swingOrTurn: 55, variation: 60, control: 62 },
        fielding: { catching: 70, throwPower: 72, throwAccuracy: 68, agility: 65 },
        physical: { stamina: 80, consistency: 72, matchAwareness: 78 },
        signature: createAbility(
            'Spin Basher', ABILITY_TRIGGERS.SITUATIONAL,
            'Vs Spin: Power +20, Lofted Timing +15%.',
            (ms) => !isPaceBowler(getPlayerById(ms.bowlerId)),
            { powerAdd: 20, loftedTimingMult: 1.15 }
        ),
        aiTendency: { aggression: 0.82, spinLoftedPreference: 0.9 }
    },
    {
        id: 'salman_mirza',
        name: 'Salman Mirza',
        country: 'Pakistan',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.PACE,
        batting: { timing: 25, shotPlacement: 20, power: 45, footwork: 25, composure: 45 },
        bowling: { paceOrSpin: 86, accuracy: 74, swingOrTurn: 72, variation: 82, control: 70 },
        fielding: { catching: 58, throwPower: 80, throwAccuracy: 70, agility: 72 },
        physical: { stamina: 82, consistency: 70, matchAwareness: 72 },
        signature: null,
        aiTendency: { yorkerChance: 0.4, bouncerChance: 0.25 }
    },
    {
        id: 'hasaranga',
        name: 'Wanindu Hasaranga',
        country: 'Sri Lanka',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.SPIN_LEG,
        batting: { timing: 74, shotPlacement: 72, power: 80, footwork: 78, composure: 78 },
        bowling: { paceOrSpin: 84, accuracy: 88, swingOrTurn: 92, variation: 95, control: 86 },
        fielding: { catching: 80, throwPower: 78, throwAccuracy: 80, agility: 88 },
        physical: { stamina: 90, consistency: 84, matchAwareness: 92 },
        signature: createAbility(
            'Googly Master', ABILITY_TRIGGERS.PASSIVE,
            'Googly disguise +30%, Turn +15.',
            () => true,
            { variationDisguiseMult: 1.3, turnAdd: 15 }
        ),
        aiTendency: { googlyFrequency: 0.4, flightedChance: 0.25 }
    },
    {
        id: 'k_mendis',
        name: 'Kusal Mendis',
        country: 'Sri Lanka',
        role: PLAYER_ROLES.WICKETKEEPER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 84, shotPlacement: 86, power: 78, footwork: 86, composure: 76 },
        bowling: { paceOrSpin: 10, accuracy: 10, swingOrTurn: 10, variation: 10, control: 10 },
        fielding: { catching: 82, throwPower: 70, throwAccuracy: 72, agility: 80 },
        physical: { stamina: 85, consistency: 72, matchAwareness: 78 },
        signature: null,
        aiTendency: { aggression: 0.7, startSlow: false }
    },
    {
        id: 'shanaka',
        name: 'Dasun Shanaka',
        country: 'Sri Lanka',
        role: PLAYER_ROLES.ALL_ROUNDER,
        bowlingStyle: BOWLING_STYLE.MEDIUM,
        batting: { timing: 78, shotPlacement: 74, power: 88, footwork: 74, composure: 88 },
        bowling: { paceOrSpin: 74, accuracy: 78, swingOrTurn: 68, variation: 80, control: 78 },
        fielding: { catching: 80, throwPower: 82, throwAccuracy: 78, agility: 75 },
        physical: { stamina: 88, consistency: 80, matchAwareness: 94 },
        signature: createAbility(
            'Pressure Performer', ABILITY_TRIGGERS.SITUATIONAL,
            'High pressure: Timing +15, Composure +20.',
            (ms) => ms.pressure > 0.6,
            { timingAdd: 15, composureAdd: 20 }
        ),
        aiTendency: { aggression: 0.75, finisherMode: true }
    },
    {
        id: 'k_perera',
        name: 'Kusal Perera',
        country: 'Sri Lanka',
        role: PLAYER_ROLES.WICKETKEEPER,
        bowlingStyle: BOWLING_STYLE.NONE,
        batting: { timing: 82, shotPlacement: 78, power: 86, footwork: 84, composure: 72 },
        bowling: { paceOrSpin: 5, accuracy: 5, swingOrTurn: 5, variation: 5, control: 5 },
        fielding: { catching: 78, throwPower: 72, throwAccuracy: 70, agility: 82 },
        physical: { stamina: 84, consistency: 78, matchAwareness: 84 },
        isOpener: true,
        signature: null,
        aiTendency: { aggression: 0.92, preferredSide: 'legside' }
    },
    {
        id: 'ajmal',
        name: 'Saeed Ajmal',
        country: 'Pakistan',
        role: PLAYER_ROLES.BOWLER,
        bowlingStyle: BOWLING_STYLE.SPIN_OFF,
        batting: { timing: 28, shotPlacement: 22, power: 35, footwork: 25, composure: 50 },
        bowling: { paceOrSpin: 88, accuracy: 94, swingOrTurn: 96, variation: 98, control: 90 },
        fielding: { catching: 55, throwPower: 60, throwAccuracy: 65, agility: 58 },
        physical: { stamina: 85, consistency: 92, matchAwareness: 94 },
        signature: createAbility(
            'Doosra King', ABILITY_TRIGGERS.PASSIVE,
            'Doosra turn +25, Disguise +40%.',
            () => true,
            { doosraTurnAdd: 25, variationDisguiseMult: 1.4 }
        ),
        aiTendency: { doosraFrequency: 0.45, armBallChance: 0.2 }
    }
];

// ── TEAM COMPOSITIONS ──────────────────────────────────────

const TEAMS = {
    legends_xi: {
        name: 'Legends XI',
        color: '#FFD700',
        players: ['tendulkar', 'kohli', 'lara', 'devilliers', 'dhoni', 'kallis', 'afridi', 'akram', 'warne', 'steyn', 'murali']
    },
    world_xi: {
        name: 'World XI',
        color: '#00BFFF',
        players: ['gayle', 'sangakkara', 'kohli', 'devilliers', 'dhoni', 'shakib', 'afridi', 'malinga', 'murali', 'akram', 'steyn']
    },
    asia_xi: {
        name: 'Asia XI',
        color: '#FF6B35',
        players: ['tendulkar', 'kohli', 'sangakkara', 'dhoni', 'shakib', 'afridi', 'akram', 'murali', 'malinga', 'warne', 'steyn']
    },
    pace_attack: {
        name: 'Pace Attack XI',
        color: '#DC143C',
        players: ['gayle', 'lara', 'kohli', 'devilliers', 'dhoni', 'kallis', 'afridi', 'akram', 'steyn', 'malinga', 'warne']
    },
    modern_t20_xi: {
        name: 'Modern T20 XI',
        color: '#16A34A',
        players: ['finn_allen', 'banton', 'samson', 'pollard', 'holder', 'shadab', 'seifert', 'bumrah', 'amir', 'zampa', 'ferguson']
    },
    death_specialists: {
        name: 'Death Specialists',
        color: '#B91C1C',
        players: ['pollard', 'dhoni', 'holder', 'shadab', 'umar_gul', 'bumrah', 'zaman_khan', 'malinga', 'steyn', 'marco_jansen', 'amir']
    },
    spin_attack: {
        name: 'Spin Attack XI',
        color: '#7C3AED',
        players: ['sangakkara', 'kohli', 'lara', 'shakib', 'shadab', 'afridi', 'warne', 'murali', 'zampa', 'chris_green', 'dhoni']
    },
    explosive_openers: {
        name: 'Explosive Openers XI',
        color: '#EA580C',
        players: ['gayle', 'finn_allen', 'banton', 'lendl_simmons', 'samson', 'pollard', 'holder', 'ferguson', 'bumrah', 'zaman_khan', 'zampa']
    },
    pakistan_t20_mix: {
        name: 'Pakistan T20 Mix',
        color: '#15803D',
        players: ['sarfaraz', 'amir', 'shadab', 'zaman_khan', 'umar_gul', 'afridi', 'akram', 'lendl_simmons', 'samson', 'kohli', 'warne']
    },
    franchise_power_xi: {
        name: 'Franchise Power XI',
        color: '#0EA5E9',
        players: ['finn_allen', 'gayle', 'devilliers', 'pollard', 'samson', 'banton', 'holder', 'shadab', 'bumrah', 'ferguson', 'zampa']
    }
};

const PLAYER_ALLOWED_SHOTS = Object.freeze({
    kohli: ['defensive', 'drive', 'cut', 'flick', 'straight_drive', 'on_drive', 'lofted'],
    tendulkar: ['defensive', 'drive', 'cut', 'pull', 'sweep', 'straight_drive', 'late_cut', 'flick', 'on_drive', 'lofted'],
    devilliers: ['defensive', 'drive', 'pull', 'sweep', 'cut', 'lofted', 'scoop', 'switch_hit', 'reverse_sweep', 'ramp_lap', 'upper_cut', 'lap', 'reverse_lap', 'inside_out'],
    gayle: ['defensive', 'drive', 'pull', 'lofted', 'slog', 'slog_sweep', 'flick'],
    afridi: ['defensive', 'drive', 'pull', 'sweep', 'lofted', 'slog', 'slog_sweep', 'charge'],
    lara: ['defensive', 'drive', 'cut', 'pull', 'sweep', 'late_cut', 'inside_out', 'straight_drive', 'lofted'],
    malinga: ['defensive', 'drive', 'lofted'],
    akram: ['defensive', 'drive', 'lofted', 'flick'],
    murali: ['defensive', 'drive', 'lofted'],
    warne: ['defensive', 'drive', 'lofted', 'slog_sweep'],
    steyn: ['defensive', 'drive', 'lofted'],
    kallis: ['defensive', 'drive', 'cut', 'pull', 'straight_drive', 'flick', 'on_drive', 'lofted'],
    shakib: ['defensive', 'drive', 'cut', 'sweep', 'reverse_sweep', 'slog_sweep', 'flick', 'lofted'],
    dhoni: ['defensive', 'drive', 'pull', 'lofted', 'scoop', 'helicopter', 'flick', 'on_drive'],
    sangakkara: ['defensive', 'drive', 'cut', 'sweep', 'late_cut', 'flick', 'lofted'],
    banton: ['defensive', 'drive', 'pull', 'cut', 'lofted', 'scoop', 'upper_cut'],
    holder: ['defensive', 'drive', 'pull', 'lofted'],
    amir: ['defensive', 'drive', 'lofted'],
    bumrah: ['defensive', 'drive', 'lofted'],
    samson: ['defensive', 'drive', 'pull', 'cut', 'lofted', 'inside_out', 'upper_cut'],
    sarfaraz: ['defensive', 'drive', 'cut', 'flick', 'lofted'],
    chris_green: ['defensive', 'drive', 'lofted'],
    zaman_khan: ['defensive', 'drive', 'lofted'],
    finn_allen: ['defensive', 'drive', 'pull', 'cut', 'lofted', 'slog', 'scoop'],
    seifert: ['defensive', 'drive', 'pull', 'cut', 'lofted', 'ramp_lap'],
    ferguson: ['defensive', 'drive', 'lofted'],
    shadab: ['defensive', 'drive', 'cut', 'sweep', 'reverse_sweep', 'slog_sweep', 'lofted'],
    zampa: ['defensive', 'drive', 'lofted'],
    pollard: ['defensive', 'drive', 'pull', 'lofted', 'scoop', 'slog', 'slog_sweep', 'helicopter'],
    umar_gul: ['defensive', 'drive', 'lofted'],
    lendl_simmons: ['defensive', 'drive', 'pull', 'cut', 'flick', 'lofted'],
    marco_jansen: ['defensive', 'drive', 'pull', 'lofted'],
    hassan_ali: ['defensive', 'drive', 'lofted'],
    rohit: ['defensive', 'drive', 'pull', 'cut', 'lofted', 'flick', 'straight_drive', 'on_drive'],
    smith: ['defensive', 'drive', 'cut', 'flick', 'lofted', 'scoop', 'reverse_sweep'],
    d_mitchell: ['defensive', 'drive', 'pull', 'lofted'],
    santner: ['defensive', 'drive', 'cut', 'lofted'],
    hardik: ['defensive', 'drive', 'pull', 'lofted', 'flick'],
    russell: ['defensive', 'drive', 'pull', 'lofted', 'slog'],
    pooran: ['defensive', 'drive', 'pull', 'cut', 'lofted', 'scoop'],
    roy: ['defensive', 'drive', 'pull', 'cut', 'lofted'],
    henry: ['defensive', 'drive', 'lofted'],
    hetmyer: ['defensive', 'drive', 'pull', 'lofted', 'slog'],
    rutherford: ['defensive', 'drive', 'pull', 'lofted'],
    dube: ['defensive', 'drive', 'pull', 'lofted', 'slog'],
    salman_mirza: ['defensive', 'drive', 'lofted'],
    hasaranga: ['defensive', 'drive', 'cut', 'lofted', 'slog_sweep'],
    k_mendis: ['defensive', 'drive', 'cut', 'pull', 'lofted'],
    shanaka: ['defensive', 'drive', 'pull', 'lofted'],
    k_perera: ['defensive', 'drive', 'pull', 'lofted', 'slog'],
    ajmal: ['defensive', 'drive', 'lofted']
});

const PLAYER_ALLOWED_DELIVERIES = Object.freeze({
    kohli: ['good_length', 'full_length', 'inswing', 'slower_ball'],
    tendulkar: ['stock', 'flighted', 'top_spinner'],
    gayle: ['stock', 'arm_ball', 'flighted', 'top_spinner'],
    afridi: ['stock', 'googly', 'flipper', 'slider', 'top_spinner', 'flighted'],
    lara: [],
    malinga: ['yorker', 'slower_ball', 'slower_bouncer', 'good_length', 'bouncer', 'inswing'],
    akram: ['yorker', 'good_length', 'full_length', 'inswing', 'outswing', 'off_cutter'],
    murali: ['stock', 'doosra', 'arm_ball', 'carrom_ball', 'flighted', 'top_spinner'],
    warne: ['stock', 'googly', 'flipper', 'slider', 'flighted', 'top_spinner'],
    steyn: ['yorker', 'bouncer', 'good_length', 'full_length', 'outswing', 'knuckle_ball'],
    kallis: ['good_length', 'full_length', 'inswing', 'outswing', 'off_cutter'],
    shakib: ['stock', 'doosra', 'arm_ball', 'carrom_ball', 'flighted', 'top_spinner'],
    dhoni: [],
    sangakkara: [],
    banton: [],
    holder: ['good_length', 'full_length', 'slower_ball', 'off_cutter', 'inswing', 'outswing'],
    amir: ['yorker', 'inswing', 'outswing', 'good_length', 'full_length', 'off_cutter'],
    bumrah: ['yorker', 'good_length', 'slower_ball', 'knuckle_ball', 'off_cutter', 'bouncer'],
    samson: [],
    sarfaraz: [],
    chris_green: ['stock', 'carrom_ball', 'arm_ball', 'flighted', 'slider', 'top_spinner'],
    zaman_khan: ['yorker', 'slower_ball', 'knuckle_ball', 'full_length', 'good_length', 'bouncer'],
    finn_allen: [],
    seifert: [],
    ferguson: ['bouncer', 'slower_bouncer', 'yorker', 'good_length', 'off_cutter', 'outswing'],
    shadab: ['stock', 'googly', 'flipper', 'slider', 'flighted', 'top_spinner'],
    zampa: ['stock', 'googly', 'flipper', 'slider', 'flighted', 'top_spinner'],
    pollard: ['good_length', 'full_length', 'slower_ball', 'off_cutter'],
    umar_gul: ['yorker', 'slower_ball', 'knuckle_ball', 'off_cutter', 'good_length', 'bouncer'],
    lendl_simmons: ['good_length', 'full_length', 'slower_ball'],
    marco_jansen: ['good_length', 'full_length', 'bouncer', 'slower_bouncer', 'outswing', 'off_cutter'],
    hassan_ali: ['good_length', 'full_length', 'yorker', 'slower_ball', 'bouncer', 'inswing'],
    d_mitchell: ['good_length', 'full_length', 'slower_ball'],
    santner: ['stock', 'arm_ball', 'flighted', 'top_spinner'],
    hardik: ['good_length', 'full_length', 'bouncer', 'yorker', 'slower_ball'],
    russell: ['yorker', 'bouncer', 'good_length', 'slower_ball'],
    henry: ['good_length', 'full_length', 'outswing', 'inswing', 'bouncer'],
    rutherford: ['good_length', 'full_length', 'slower_ball', 'off_cutter'],
    dube: ['good_length', 'full_length', 'slower_ball'],
    salman_mirza: ['yorker', 'bouncer', 'good_length', 'full_length'],
    hasaranga: ['stock', 'googly', 'flipper', 'slider', 'flighted'],
    shanaka: ['good_length', 'full_length', 'slower_ball', 'off_cutter'],
    ajmal: ['stock', 'doosra', 'arm_ball', 'carrom_ball', 'flighted', 'top_spinner']
});

PLAYERS.forEach((player) => {
    const allowed = PLAYER_ALLOWED_SHOTS[player.id];
    player.allowedShotIds = Array.isArray(allowed) && allowed.length > 0
        ? [...allowed]
        : ['defensive', 'drive', 'lofted'];

    const allowedDeliveries = PLAYER_ALLOWED_DELIVERIES[player.id];
    if (Array.isArray(allowedDeliveries) && allowedDeliveries.length > 0) {
        player.allowedDeliveryIds = [...allowedDeliveries];
    }
});

// ── DELIVERY TYPES ─────────────────────────────────────────

const PACE_DELIVERIES = [
    { id: 'yorker', name: 'Yorker', length: 'full', risk: 0.3, difficulty: 0.8, icon: 'v' },
    { id: 'bouncer', name: 'Bouncer', length: 'short', risk: 0.25, difficulty: 0.5, icon: '^' },
    { id: 'good_length', name: 'Good Length', length: 'good', risk: 0.1, difficulty: 0.3, icon: '+' },
    { id: 'full_length', name: 'Full Length', length: 'full_driving', risk: 0.15, difficulty: 0.4, icon: '|' },
    { id: 'slower_ball', name: 'Slower Ball', length: 'good', risk: 0.2, difficulty: 0.6, icon: '~' },
    { id: 'knuckle_ball', name: 'Knuckle Ball', length: 'good', risk: 0.24, difficulty: 0.72, icon: 'K' },
    { id: 'off_cutter', name: 'Off Cutter', length: 'good', risk: 0.2, difficulty: 0.62, icon: 'OC' },
    { id: 'slower_bouncer', name: 'Slower Bouncer', length: 'short', risk: 0.28, difficulty: 0.66, icon: 'SB' },
    { id: 'inswing', name: 'In-Swing', length: 'good', risk: 0.15, difficulty: 0.5, icon: '<' },
    { id: 'outswing', name: 'Out-Swing', length: 'good', risk: 0.15, difficulty: 0.5, icon: '>' }
];

const SPIN_DELIVERIES = [
    { id: 'stock', name: 'Stock Ball', length: 'good', risk: 0.1, difficulty: 0.3, icon: '🎯' },
    { id: 'doosra', name: 'Doosra', length: 'good', risk: 0.25, difficulty: 0.7, icon: '🌀' },
    { id: 'googly', name: 'Googly', length: 'good', risk: 0.25, difficulty: 0.7, icon: 'G' },
    { id: 'flighted', name: 'Flighted', length: 'full_driving', risk: 0.2, difficulty: 0.5, icon: '*' },
    { id: 'arm_ball', name: 'Arm Ball', length: 'good', risk: 0.15, difficulty: 0.5, icon: '🧿' },
    { id: 'top_spinner', name: 'Top Spinner', length: 'good', risk: 0.15, difficulty: 0.5, icon: '🧲' },
    { id: 'carrom_ball', name: 'Carrom Ball', length: 'good', risk: 0.24, difficulty: 0.74, icon: 'CB' },
    { id: 'flipper', name: 'Flipper', length: 'full', risk: 0.24, difficulty: 0.72, icon: 'F' },
    { id: 'slider', name: 'Slider', length: 'good', risk: 0.22, difficulty: 0.66, icon: 'SL' }
];

// ── SHOT TYPES ─────────────────────────────────────────────

const SHOT_TYPES = [
    { id: 'defensive', name: 'Defend', key: '1', risk: 0.05, powerMult: 0.2, category: 'defensive', icon: 'D' },
    { id: 'drive', name: 'Drive', key: '2', risk: 0.15, powerMult: 0.7, category: 'drive', icon: '🚗' },
    { id: 'pull', name: 'Pull/Hook', key: '3', risk: 0.3, powerMult: 0.85, category: 'power', icon: 'P' },
    { id: 'sweep', name: 'Sweep', key: '4', risk: 0.25, powerMult: 0.6, category: 'sweep', icon: 'S' },
    { id: 'cut', name: 'Cut', key: '5', risk: 0.2, powerMult: 0.65, category: 'drive', icon: 'C' },
    { id: 'lofted', name: 'Lofted', key: '6', risk: 0.45, powerMult: 1.0, category: 'power', icon: 'L' },
    { id: 'scoop', name: 'Scoop/Ramp', key: '7', risk: 0.55, powerMult: 0.5, category: 'innovative', icon: 'R' },
    { id: 'switch_hit', name: 'Switch Hit', key: '8', risk: 0.5, powerMult: 0.75, category: 'innovative', icon: '🔀' },
    { id: 'straight_drive', name: 'Straight Drive', key: '', risk: 0.13, powerMult: 0.72, category: 'drive', icon: 'SD' },
    { id: 'on_drive', name: 'On Drive', key: '', risk: 0.18, powerMult: 0.72, category: 'drive', icon: 'OD' },
    { id: 'flick', name: 'Flick', key: '', risk: 0.18, powerMult: 0.66, category: 'drive', icon: 'FL' },
    { id: 'late_cut', name: 'Late Cut', key: '', risk: 0.26, powerMult: 0.62, category: 'drive', icon: 'LC' },
    { id: 'upper_cut', name: 'Upper Cut', key: '', risk: 0.42, powerMult: 0.78, category: 'innovative', icon: 'UC' },
    { id: 'inside_out', name: 'Inside Out', key: '', risk: 0.33, powerMult: 0.80, category: 'innovative', icon: 'IO' },
    { id: 'backfoot_punch', name: 'Backfoot Punch', key: '', risk: 0.20, powerMult: 0.68, category: 'drive', icon: 'BP' },
    { id: 'dab', name: 'Dab', key: '', risk: 0.24, powerMult: 0.50, category: 'innovative', icon: 'DB' },
    { id: 'lap', name: 'Lap', key: '', risk: 0.36, powerMult: 0.54, category: 'innovative', icon: 'LP' },
    { id: 'reverse_lap', name: 'Reverse Lap', key: '', risk: 0.50, powerMult: 0.58, category: 'innovative', icon: 'RL' },
    { id: 'ramp_lap', name: 'Ramp', key: '', risk: 0.52, powerMult: 0.56, category: 'innovative', icon: 'RA' },
    { id: 'reverse_sweep', name: 'Reverse Sweep', key: '', risk: 0.40, powerMult: 0.62, category: 'innovative', icon: 'RS' },
    { id: 'paddle_sweep', name: 'Paddle Sweep', key: '', risk: 0.28, powerMult: 0.56, category: 'sweep', icon: 'PS' },
    { id: 'slog_sweep', name: 'Slog Sweep', key: '', risk: 0.44, powerMult: 0.92, category: 'power', icon: 'SS' },
    { id: 'helicopter', name: 'Helicopter', key: '', risk: 0.50, powerMult: 1.05, category: 'power', icon: 'H' },
    { id: 'charge', name: 'Charge', key: '', risk: 0.36, powerMult: 0.88, category: 'power', icon: 'CH' },
    { id: 'chip', name: 'Chip', key: '', risk: 0.23, powerMult: 0.55, category: 'drive', icon: 'CP' },
    { id: 'lofted_cover', name: 'Lofted Cover', key: '', risk: 0.40, powerMult: 0.94, category: 'power', icon: 'LCV' },
    { id: 'slog', name: 'Slog', key: '', risk: 0.48, powerMult: 1.00, category: 'power', icon: 'SG' },
    { id: 'glance', name: 'Glance', key: '', risk: 0.16, powerMult: 0.60, category: 'drive', icon: 'GL' }
];

// ── PITCH TYPES ────────────────────────────────────────────

const PITCH_TYPES = [
    { id: 'batting', name: 'Batting Friendly', timingMod: 1.1, paceMod: 0.8, spinMod: 0.7, bounceVar: 0.05, color: '#8B7355' },
    { id: 'pace', name: 'Pace Friendly', timingMod: 0.9, paceMod: 1.2, spinMod: 0.9, bounceVar: 0.15, color: '#556B2F' },
    { id: 'spin', name: 'Spin Friendly', timingMod: 0.95, paceMod: 0.9, spinMod: 1.4, bounceVar: 0.12, color: '#C4A35A' },
    { id: 'worn', name: 'Worn Pitch', timingMod: 0.85, paceMod: 0.85, spinMod: 1.6, bounceVar: 0.25, color: '#8B8378' }
];

// Data-driven shot and field tuning profiles for modular simulation layers.
const SHOT_TRAJECTORY_PROFILES = {
    defensive:  { baseElevation: 7,  groundRoll: 0.25, aerialBias: 0.15, controlBias: 1.15 },
    drive:      { baseElevation: 14, groundRoll: 0.55, aerialBias: 0.35, controlBias: 1.0 },
    pull:       { baseElevation: 20, groundRoll: 0.40, aerialBias: 0.65, controlBias: 0.85 },
    sweep:      { baseElevation: 12, groundRoll: 0.45, aerialBias: 0.30, controlBias: 0.95 },
    cut:        { baseElevation: 11, groundRoll: 0.52, aerialBias: 0.25, controlBias: 1.0 },
    lofted:     { baseElevation: 28, groundRoll: 0.18, aerialBias: 0.95, controlBias: 0.75 },
    scoop:      { baseElevation: 33, groundRoll: 0.10, aerialBias: 1.00, controlBias: 0.65 },
    switch_hit: { baseElevation: 26, groundRoll: 0.20, aerialBias: 0.85, controlBias: 0.70 },
    straight_drive: { baseElevation: 12, groundRoll: 0.60, aerialBias: 0.22, controlBias: 1.08 },
    on_drive:       { baseElevation: 13, groundRoll: 0.58, aerialBias: 0.28, controlBias: 1.04 },
    flick:          { baseElevation: 12, groundRoll: 0.50, aerialBias: 0.30, controlBias: 1.03 },
    late_cut:       { baseElevation: 10, groundRoll: 0.54, aerialBias: 0.22, controlBias: 1.02 },
    upper_cut:      { baseElevation: 24, groundRoll: 0.22, aerialBias: 0.76, controlBias: 0.78 },
    inside_out:     { baseElevation: 20, groundRoll: 0.34, aerialBias: 0.68, controlBias: 0.86 },
    backfoot_punch: { baseElevation: 11, groundRoll: 0.55, aerialBias: 0.24, controlBias: 1.02 },
    dab:            { baseElevation: 8,  groundRoll: 0.42, aerialBias: 0.18, controlBias: 1.10 },
    lap:            { baseElevation: 18, groundRoll: 0.28, aerialBias: 0.64, controlBias: 0.80 },
    reverse_lap:    { baseElevation: 22, groundRoll: 0.22, aerialBias: 0.72, controlBias: 0.70 },
    ramp_lap:       { baseElevation: 26, groundRoll: 0.18, aerialBias: 0.82, controlBias: 0.68 },
    reverse_sweep:  { baseElevation: 16, groundRoll: 0.35, aerialBias: 0.46, controlBias: 0.82 },
    paddle_sweep:   { baseElevation: 13, groundRoll: 0.40, aerialBias: 0.38, controlBias: 0.92 },
    slog_sweep:     { baseElevation: 24, groundRoll: 0.26, aerialBias: 0.78, controlBias: 0.74 },
    helicopter:     { baseElevation: 27, groundRoll: 0.18, aerialBias: 0.90, controlBias: 0.70 },
    charge:         { baseElevation: 20, groundRoll: 0.30, aerialBias: 0.62, controlBias: 0.80 },
    chip:           { baseElevation: 14, groundRoll: 0.35, aerialBias: 0.42, controlBias: 0.95 },
    lofted_cover:   { baseElevation: 25, groundRoll: 0.22, aerialBias: 0.82, controlBias: 0.76 },
    slog:           { baseElevation: 23, groundRoll: 0.26, aerialBias: 0.80, controlBias: 0.72 },
    glance:         { baseElevation: 9,  groundRoll: 0.52, aerialBias: 0.20, controlBias: 1.04 }
};

const SHOT_MATCHUP_PROFILES = {
    defensive: {
        length:   { yorker: 1.10, full: 1.20, full_driving: 1.15, good: 1.25, short: 0.75 },
        line:     { outside_off: 1.00, stumps: 1.05, outside_leg: 0.95 },
        delivery: { yorker: 0.90, bouncer: 0.85, doosra: 1.05, googly: 1.00, inswing: 1.00, outswing: 0.95, knuckle_ball: 0.96, off_cutter: 0.92, flipper: 0.86 },
        paceSpin: { pace: 1.00, spin: 1.05 },
        movementSensitivity: 0.45
    },
    drive: {
        length:   { yorker: 0.55, full: 1.40, full_driving: 1.55, good: 0.85, short: 0.25 },
        line:     { outside_off: 1.10, stumps: 1.00, outside_leg: 0.85 },
        delivery: { yorker: 0.65, bouncer: 0.30, slower_ball: 0.95, inswing: 0.92, outswing: 0.88, googly: 0.82, doosra: 0.82, knuckle_ball: 0.74, off_cutter: 0.78, flipper: 0.70, slider: 0.78 },
        paceSpin: { pace: 1.00, spin: 0.96 },
        movementSensitivity: 0.75
    },
    pull: {
        length:   { yorker: 0.22, full: 0.40, full_driving: 0.45, good: 0.75, short: 1.60 },
        line:     { outside_off: 0.90, stumps: 1.00, outside_leg: 1.15 },
        delivery: { yorker: 0.25, bouncer: 1.45, slower_ball: 0.88, inswing: 0.80, outswing: 0.86, slower_bouncer: 1.20, knuckle_ball: 0.76, off_cutter: 0.72 },
        paceSpin: { pace: 1.10, spin: 0.78 },
        movementSensitivity: 0.80
    },
    sweep: {
        length:   { yorker: 0.55, full: 1.05, full_driving: 1.00, good: 1.35, short: 0.45 },
        line:     { outside_off: 0.80, stumps: 1.00, outside_leg: 1.12 },
        delivery: { yorker: 0.75, bouncer: 0.50, arm_ball: 1.00, doosra: 0.95, googly: 0.88, carrom_ball: 0.82, flipper: 0.70, slider: 0.84 },
        paceSpin: { pace: 0.62, spin: 1.22 },
        movementSensitivity: 0.65
    },
    cut: {
        length:   { yorker: 0.35, full: 0.55, full_driving: 0.60, good: 0.95, short: 1.48 },
        line:     { outside_off: 1.20, stumps: 0.92, outside_leg: 0.65 },
        delivery: { yorker: 0.45, bouncer: 1.15, outswing: 1.05, inswing: 0.82, slower_ball: 0.92, slower_bouncer: 0.98, knuckle_ball: 0.86, off_cutter: 0.80 },
        paceSpin: { pace: 1.00, spin: 0.90 },
        movementSensitivity: 0.70
    },
    lofted: {
        length:   { yorker: 0.65, full: 1.30, full_driving: 1.45, good: 0.78, short: 0.52 },
        line:     { outside_off: 1.00, stumps: 1.02, outside_leg: 1.04 },
        delivery: { yorker: 0.85, bouncer: 0.60, slower_ball: 0.82, inswing: 0.80, outswing: 0.82, googly: 0.82, doosra: 0.82, knuckle_ball: 0.74, off_cutter: 0.76, flipper: 0.66, slider: 0.72 },
        paceSpin: { pace: 1.00, spin: 1.00 },
        movementSensitivity: 0.85
    },
    scoop: {
        length:   { yorker: 1.52, full: 1.18, full_driving: 0.95, good: 0.58, short: 0.30 },
        line:     { outside_off: 0.75, stumps: 1.00, outside_leg: 1.06 },
        delivery: { yorker: 1.40, bouncer: 0.35, slower_ball: 0.95, inswing: 0.80, outswing: 0.80, knuckle_ball: 0.90, slower_bouncer: 0.32, off_cutter: 0.82 },
        paceSpin: { pace: 1.10, spin: 0.85 },
        movementSensitivity: 0.95
    },
    switch_hit: {
        length:   { yorker: 0.55, full: 1.00, full_driving: 1.05, good: 1.08, short: 0.92 },
        line:     { outside_off: 1.05, stumps: 1.00, outside_leg: 1.00 },
        delivery: { yorker: 0.72, bouncer: 0.65, googly: 1.15, doosra: 1.12, flighted: 1.08, arm_ball: 1.00, carrom_ball: 0.92, flipper: 0.82, slider: 0.90 },
        paceSpin: { pace: 0.75, spin: 1.25 },
        movementSensitivity: 0.90
    },
    straight_drive: {
        length:   { yorker: 0.45, full: 1.45, full_driving: 1.65, good: 0.82, short: 0.20 },
        line:     { outside_off: 1.05, stumps: 1.12, outside_leg: 0.80 },
        delivery: { yorker: 0.52, bouncer: 0.22, inswing: 0.92, outswing: 0.88, off_cutter: 0.82 },
        paceSpin: { pace: 1.00, spin: 0.94 },
        movementSensitivity: 0.80
    },
    on_drive: {
        length:   { yorker: 0.58, full: 1.36, full_driving: 1.48, good: 0.86, short: 0.26 },
        line:     { outside_off: 0.72, stumps: 1.08, outside_leg: 1.10 },
        delivery: { inswing: 1.05, outswing: 0.78, yorker: 0.60, off_cutter: 0.85 },
        paceSpin: { pace: 1.02, spin: 0.95 },
        movementSensitivity: 0.76
    },
    flick: {
        length:   { yorker: 0.70, full: 1.16, full_driving: 1.12, good: 1.00, short: 0.60 },
        line:     { outside_off: 0.70, stumps: 1.00, outside_leg: 1.24 },
        delivery: { inswing: 1.12, outswing: 0.76, slider: 0.92, arm_ball: 1.04 },
        paceSpin: { pace: 1.02, spin: 0.98 },
        movementSensitivity: 0.70
    },
    late_cut: {
        length:   { yorker: 0.38, full: 0.78, full_driving: 0.82, good: 1.06, short: 1.28 },
        line:     { outside_off: 1.32, stumps: 0.82, outside_leg: 0.42 },
        delivery: { outswing: 1.10, inswing: 0.66, bouncer: 0.92, slower_bouncer: 0.82 },
        paceSpin: { pace: 1.00, spin: 0.90 },
        movementSensitivity: 0.82
    },
    upper_cut: {
        length:   { yorker: 0.20, full: 0.35, full_driving: 0.40, good: 0.62, short: 1.62 },
        line:     { outside_off: 1.28, stumps: 0.80, outside_leg: 0.28 },
        delivery: { bouncer: 1.48, slower_bouncer: 1.20, outswing: 1.06, inswing: 0.60 },
        paceSpin: { pace: 1.14, spin: 0.68 },
        movementSensitivity: 0.96
    },
    inside_out: {
        length:   { yorker: 0.46, full: 1.10, full_driving: 1.20, good: 1.02, short: 0.50 },
        line:     { outside_off: 1.14, stumps: 1.00, outside_leg: 0.72 },
        delivery: { flighted: 1.12, doosra: 0.88, googly: 0.94, carrom_ball: 0.84 },
        paceSpin: { pace: 0.82, spin: 1.12 },
        movementSensitivity: 0.84
    },
    backfoot_punch: {
        length:   { yorker: 0.40, full: 0.72, full_driving: 0.78, good: 1.16, short: 1.05 },
        line:     { outside_off: 1.12, stumps: 1.00, outside_leg: 0.76 },
        delivery: { off_cutter: 0.90, slider: 0.92, top_spinner: 0.88, bouncer: 0.82 },
        paceSpin: { pace: 1.00, spin: 0.98 },
        movementSensitivity: 0.74
    },
    dab: {
        length:   { yorker: 0.48, full: 0.72, full_driving: 0.76, good: 1.08, short: 1.20 },
        line:     { outside_off: 1.24, stumps: 0.90, outside_leg: 0.55 },
        delivery: { bouncer: 1.00, slower_bouncer: 1.02, outswing: 1.08, inswing: 0.68 },
        paceSpin: { pace: 1.02, spin: 0.90 },
        movementSensitivity: 0.88
    },
    lap: {
        length:   { yorker: 1.36, full: 1.12, full_driving: 0.88, good: 0.66, short: 0.30 },
        line:     { outside_off: 0.62, stumps: 1.00, outside_leg: 1.20 },
        delivery: { yorker: 1.24, slower_ball: 0.90, inswing: 1.05, outswing: 0.76 },
        paceSpin: { pace: 1.02, spin: 0.90 },
        movementSensitivity: 0.94
    },
    reverse_lap: {
        length:   { yorker: 1.22, full: 1.00, full_driving: 0.84, good: 0.64, short: 0.32 },
        line:     { outside_off: 1.08, stumps: 1.00, outside_leg: 0.68 },
        delivery: { yorker: 1.18, inswing: 0.70, outswing: 1.00, carrom_ball: 0.86 },
        paceSpin: { pace: 0.96, spin: 1.04 },
        movementSensitivity: 1.00
    },
    ramp_lap: {
        length:   { yorker: 1.44, full: 1.15, full_driving: 0.92, good: 0.58, short: 0.26 },
        line:     { outside_off: 0.82, stumps: 1.00, outside_leg: 1.08 },
        delivery: { yorker: 1.34, bouncer: 0.28, slower_bouncer: 0.40, knuckle_ball: 0.88 },
        paceSpin: { pace: 1.10, spin: 0.84 },
        movementSensitivity: 1.02
    },
    reverse_sweep: {
        length:   { yorker: 0.62, full: 1.02, full_driving: 0.96, good: 1.20, short: 0.52 },
        line:     { outside_off: 1.18, stumps: 1.00, outside_leg: 0.64 },
        delivery: { googly: 1.10, doosra: 0.92, carrom_ball: 0.86, slider: 0.90 },
        paceSpin: { pace: 0.64, spin: 1.30 },
        movementSensitivity: 0.94
    },
    paddle_sweep: {
        length:   { yorker: 0.82, full: 1.04, full_driving: 1.00, good: 1.14, short: 0.56 },
        line:     { outside_off: 0.72, stumps: 1.00, outside_leg: 1.16 },
        delivery: { arm_ball: 1.08, top_spinner: 0.94, flipper: 0.84 },
        paceSpin: { pace: 0.66, spin: 1.22 },
        movementSensitivity: 0.82
    },
    slog_sweep: {
        length:   { yorker: 0.44, full: 1.12, full_driving: 1.20, good: 1.10, short: 0.54 },
        line:     { outside_off: 0.62, stumps: 1.00, outside_leg: 1.24 },
        delivery: { flighted: 1.16, doosra: 0.86, googly: 0.82, flipper: 0.70 },
        paceSpin: { pace: 0.62, spin: 1.28 },
        movementSensitivity: 0.88
    },
    helicopter: {
        length:   { yorker: 1.34, full: 1.16, full_driving: 0.96, good: 0.74, short: 0.34 },
        line:     { outside_off: 0.72, stumps: 1.00, outside_leg: 1.08 },
        delivery: { yorker: 1.30, inswing: 1.04, off_cutter: 0.84, knuckle_ball: 0.80 },
        paceSpin: { pace: 1.08, spin: 0.82 },
        movementSensitivity: 0.94
    },
    charge: {
        length:   { yorker: 0.28, full: 1.24, full_driving: 1.30, good: 0.88, short: 0.36 },
        line:     { outside_off: 0.94, stumps: 1.00, outside_leg: 1.02 },
        delivery: { flighted: 1.22, top_spinner: 0.82, flipper: 0.64, bouncer: 0.28 },
        paceSpin: { pace: 0.58, spin: 1.34 },
        movementSensitivity: 0.96
    },
    chip: {
        length:   { yorker: 0.66, full: 1.06, full_driving: 1.04, good: 1.00, short: 0.62 },
        line:     { outside_off: 1.04, stumps: 1.00, outside_leg: 0.90 },
        delivery: { off_cutter: 0.96, slider: 0.94, knuckle_ball: 0.88 },
        paceSpin: { pace: 0.92, spin: 1.02 },
        movementSensitivity: 0.76
    },
    lofted_cover: {
        length:   { yorker: 0.52, full: 1.26, full_driving: 1.34, good: 0.90, short: 0.40 },
        line:     { outside_off: 1.24, stumps: 0.94, outside_leg: 0.58 },
        delivery: { outswing: 0.92, inswing: 0.76, knuckle_ball: 0.82, off_cutter: 0.86 },
        paceSpin: { pace: 0.96, spin: 1.02 },
        movementSensitivity: 0.90
    },
    slog: {
        length:   { yorker: 0.38, full: 1.08, full_driving: 1.12, good: 1.00, short: 0.68 },
        line:     { outside_off: 0.86, stumps: 1.00, outside_leg: 1.08 },
        delivery: { knuckle_ball: 0.74, off_cutter: 0.78, slower_ball: 0.84, flipper: 0.66 },
        paceSpin: { pace: 0.96, spin: 0.98 },
        movementSensitivity: 0.98
    },
    glance: {
        length:   { yorker: 0.80, full: 1.00, full_driving: 0.94, good: 1.05, short: 0.60 },
        line:     { outside_off: 0.60, stumps: 0.96, outside_leg: 1.30 },
        delivery: { inswing: 1.08, outswing: 0.70, slider: 1.00, arm_ball: 1.04 },
        paceSpin: { pace: 1.00, spin: 0.98 },
        movementSensitivity: 0.72
    }
};

const FIELD_DENSITY_PRESETS = {
    easy:   { straight: 0.30, offside: 0.52, legside: 0.48, deep: 0.34, innerRing: 0.62 },
    medium: { straight: 0.34, offside: 0.60, legside: 0.54, deep: 0.42, innerRing: 0.70 },
    hard:   { straight: 0.40, offside: 0.68, legside: 0.62, deep: 0.50, innerRing: 0.78 }
};

const PITCH_TRAJECTORY_MODIFIERS = {
    batting: { carry: 1.08, outfield: 1.10, boundaryEase: 1.10, edgeAssist: 0.92, bounceVariance: 0.05 },
    pace:    { carry: 1.02, outfield: 1.00, boundaryEase: 0.98, edgeAssist: 1.10, bounceVariance: 0.15 },
    spin:    { carry: 0.95, outfield: 0.94, boundaryEase: 0.92, edgeAssist: 1.06, bounceVariance: 0.12 },
    worn:    { carry: 0.90, outfield: 0.90, boundaryEase: 0.88, edgeAssist: 1.18, bounceVariance: 0.25 }
};

// ── HELPER FUNCTIONS ───────────────────────────────────────

function getPlayerById(id) {
    return PLAYERS.find(p => p.id === id);
}

function getTeamPlayers(teamId) {
    const team = TEAMS[teamId];
    if (!team) return [];
    return team.players.map(pid => getPlayerById(pid)).filter(Boolean);
}

function getDeliveriesForBowler(player) {
    if (!player) return [];

    let deliveries = [];
    if (player.bowlingStyle === BOWLING_STYLE.PACE || player.bowlingStyle === BOWLING_STYLE.MEDIUM) {
        // Core pace set unless explicitly expanded by per-player allowedDeliveryIds.
        deliveries = PACE_DELIVERIES.filter((d) => ['good_length', 'full_length', 'yorker', 'slower_ball', 'inswing', 'outswing', 'bouncer'].includes(d.id));
    } else if (player.bowlingStyle === BOWLING_STYLE.SPIN_LEG) {
        deliveries = SPIN_DELIVERIES.filter((d) => ['stock', 'googly', 'flighted', 'top_spinner', 'flipper', 'slider'].includes(d.id));
    } else if (player.bowlingStyle === BOWLING_STYLE.SPIN_OFF) {
        deliveries = SPIN_DELIVERIES.filter((d) => ['stock', 'doosra', 'flighted', 'arm_ball', 'top_spinner', 'carrom_ball'].includes(d.id));
    } else {
        deliveries = SPIN_DELIVERIES;
    }

    if (!Array.isArray(player.allowedDeliveryIds) || player.allowedDeliveryIds.length === 0) {
        return deliveries;
    }

    const allowed = new Set(player.allowedDeliveryIds);
    const filtered = deliveries.filter((d) => allowed.has(d.id));
    return filtered.length > 0 ? filtered : deliveries;
}

function getShotsForBatter(player) {
    if (!player) return SHOT_TYPES.filter((s) => ['defensive', 'drive', 'lofted'].includes(s.id));

    const allowed = Array.isArray(player.allowedShotIds) ? player.allowedShotIds : [];
    if (allowed.length > 0) {
        const allowedSet = new Set(allowed);
        const filtered = SHOT_TYPES.filter((s) => allowedSet.has(s.id));
        if (filtered.length > 0) return filtered;
    }

    return SHOT_TYPES.filter((s) => ['defensive', 'drive', 'lofted'].includes(s.id));
}

function isPaceBowler(player) {
    return player.bowlingStyle === BOWLING_STYLE.PACE || player.bowlingStyle === BOWLING_STYLE.MEDIUM;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PLAYERS,
        TEAMS,
        SHOT_TYPES,
        PACE_DELIVERIES,
        SPIN_DELIVERIES,
        PITCH_TYPES,
        SHOT_TRAJECTORY_PROFILES,
        SHOT_MATCHUP_PROFILES,
        FIELD_DENSITY_PRESETS,
        PITCH_TRAJECTORY_MODIFIERS,
        PLAYER_ROLES,
        BOWLING_STYLE,
        getPlayerById,
        getTeamPlayers,
        getDeliveriesForBowler,
        getShotsForBatter,
        isPaceBowler
    };
}
