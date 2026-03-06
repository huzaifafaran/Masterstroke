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
        signature: createAbility(
            '360° Mastery', ABILITY_TRIGGERS.PASSIVE,
            'Unlock 8 extra shot angles. Innovative shot mistiming -50%.',
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
        signature: createAbility(
            'Boom Boom', ABILITY_TRIGGERS.PASSIVE,
            'Power +25, six distance +25%. Defensive timing -15%, Composure -15.',
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
        bowling: { paceOrSpin: 92, accuracy: 88, swingOrTurn: 95, variation: 88, control: 90 },
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
        physical: { stamina: 80, consistency: 88, matchAwareness: 85 },
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
    }
};

// ── DELIVERY TYPES ─────────────────────────────────────────

const PACE_DELIVERIES = [
    { id: 'yorker', name: 'Yorker', length: 'full', risk: 0.3, difficulty: 0.8, icon: 'v' },
    { id: 'bouncer', name: 'Bouncer', length: 'short', risk: 0.25, difficulty: 0.5, icon: '^' },
    { id: 'good_length', name: 'Good Length', length: 'good', risk: 0.1, difficulty: 0.3, icon: '+' },
    { id: 'full_length', name: 'Full Length', length: 'full_driving', risk: 0.15, difficulty: 0.4, icon: '|' },
    { id: 'slower_ball', name: 'Slower Ball', length: 'good', risk: 0.2, difficulty: 0.6, icon: '~' },
    { id: 'inswing', name: 'In-Swing', length: 'good', risk: 0.15, difficulty: 0.5, icon: '<' },
    { id: 'outswing', name: 'Out-Swing', length: 'good', risk: 0.15, difficulty: 0.5, icon: '>' }
];

const SPIN_DELIVERIES = [
    { id: 'stock', name: 'Stock Ball', length: 'good', risk: 0.1, difficulty: 0.3, icon: '🎯' },
    { id: 'doosra', name: 'Doosra', length: 'good', risk: 0.25, difficulty: 0.7, icon: '🌀' },
    { id: 'googly', name: 'Googly', length: 'good', risk: 0.25, difficulty: 0.7, icon: 'G' },
    { id: 'flighted', name: 'Flighted', length: 'full_driving', risk: 0.2, difficulty: 0.5, icon: '*' },
    { id: 'arm_ball', name: 'Arm Ball', length: 'good', risk: 0.15, difficulty: 0.5, icon: '🧿' },
    { id: 'top_spinner', name: 'Top Spinner', length: 'good', risk: 0.15, difficulty: 0.5, icon: '🧲' }
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
    { id: 'switch_hit', name: 'Switch Hit', key: '8', risk: 0.5, powerMult: 0.75, category: 'innovative', icon: '🔀' }
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
    switch_hit: { baseElevation: 26, groundRoll: 0.20, aerialBias: 0.85, controlBias: 0.70 }
};

const SHOT_MATCHUP_PROFILES = {
    defensive: {
        length:   { yorker: 1.10, full: 1.20, full_driving: 1.15, good: 1.25, short: 0.75 },
        line:     { outside_off: 1.00, stumps: 1.05, outside_leg: 0.95 },
        delivery: { yorker: 0.90, bouncer: 0.85, doosra: 1.05, googly: 1.00, inswing: 1.00, outswing: 0.95 },
        paceSpin: { pace: 1.00, spin: 1.05 },
        movementSensitivity: 0.45
    },
    drive: {
        length:   { yorker: 0.55, full: 1.40, full_driving: 1.55, good: 0.85, short: 0.25 },
        line:     { outside_off: 1.10, stumps: 1.00, outside_leg: 0.85 },
        delivery: { yorker: 0.65, bouncer: 0.30, slower_ball: 0.95, inswing: 0.92, outswing: 0.88, googly: 0.82, doosra: 0.82 },
        paceSpin: { pace: 1.00, spin: 0.96 },
        movementSensitivity: 0.75
    },
    pull: {
        length:   { yorker: 0.22, full: 0.40, full_driving: 0.45, good: 0.75, short: 1.60 },
        line:     { outside_off: 0.90, stumps: 1.00, outside_leg: 1.15 },
        delivery: { yorker: 0.25, bouncer: 1.45, slower_ball: 0.88, inswing: 0.80, outswing: 0.86 },
        paceSpin: { pace: 1.10, spin: 0.78 },
        movementSensitivity: 0.80
    },
    sweep: {
        length:   { yorker: 0.55, full: 1.05, full_driving: 1.00, good: 1.35, short: 0.45 },
        line:     { outside_off: 0.80, stumps: 1.00, outside_leg: 1.12 },
        delivery: { yorker: 0.75, bouncer: 0.50, arm_ball: 1.00, doosra: 0.95, googly: 0.88 },
        paceSpin: { pace: 0.62, spin: 1.22 },
        movementSensitivity: 0.65
    },
    cut: {
        length:   { yorker: 0.35, full: 0.55, full_driving: 0.60, good: 0.95, short: 1.48 },
        line:     { outside_off: 1.20, stumps: 0.92, outside_leg: 0.65 },
        delivery: { yorker: 0.45, bouncer: 1.15, outswing: 1.05, inswing: 0.82, slower_ball: 0.92 },
        paceSpin: { pace: 1.00, spin: 0.90 },
        movementSensitivity: 0.70
    },
    lofted: {
        length:   { yorker: 0.65, full: 1.30, full_driving: 1.45, good: 0.78, short: 0.52 },
        line:     { outside_off: 1.00, stumps: 1.02, outside_leg: 1.04 },
        delivery: { yorker: 0.85, bouncer: 0.60, slower_ball: 0.82, inswing: 0.80, outswing: 0.82, googly: 0.82, doosra: 0.82 },
        paceSpin: { pace: 1.00, spin: 1.00 },
        movementSensitivity: 0.85
    },
    scoop: {
        length:   { yorker: 1.52, full: 1.18, full_driving: 0.95, good: 0.58, short: 0.30 },
        line:     { outside_off: 0.75, stumps: 1.00, outside_leg: 1.06 },
        delivery: { yorker: 1.40, bouncer: 0.35, slower_ball: 0.95, inswing: 0.80, outswing: 0.80 },
        paceSpin: { pace: 1.10, spin: 0.85 },
        movementSensitivity: 0.95
    },
    switch_hit: {
        length:   { yorker: 0.55, full: 1.00, full_driving: 1.05, good: 1.08, short: 0.92 },
        line:     { outside_off: 1.05, stumps: 1.00, outside_leg: 1.00 },
        delivery: { yorker: 0.72, bouncer: 0.65, googly: 1.15, doosra: 1.12, flighted: 1.08, arm_ball: 1.00 },
        paceSpin: { pace: 0.75, spin: 1.25 },
        movementSensitivity: 0.90
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
    if (player.bowlingStyle === BOWLING_STYLE.PACE || player.bowlingStyle === BOWLING_STYLE.MEDIUM) {
        return PACE_DELIVERIES;
    }
    return SPIN_DELIVERIES;
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
        isPaceBowler
    };
}
