// ============================================================
// CRICKET LEGENDS — Dynamic Commentary System v3.3
// Scored selection, detail-priority, bowler archetypes.
// ============================================================

class CommentarySystem {
    constructor() {
        this.history = [];
        this.milestones = new Set();
        this.recentExactTexts = [];
        this.recentSemanticSigs = [];
        this.maxRecentMemory = 120;
        this.recentOpenings = [];
        this.maxRecentOpenings = 12;
        this.recentStructures = { main: [], analyst: [] };
        this.maxRecentStructures = 6;

        this.duelState = {
            lastBall: null,
            consecutiveDots: 0,
            consecutiveBoundaries: 0,
            falseShotsSinceBoundary: 0,
            bowlerOnTopScore: 0
        };

        // ── PHRASE BANKS ───────────────────────────────────
        this.PB = {
            deliveryVerbs: {
                yorker:      (bo) => [`${bo} nails the yorker`, `${bo} spears in the yorker`, `Full and fast from ${bo}`, `Right in the blockhole from ${bo}`, `${bo} targets the base of the stumps`, `A sharp yorker from ${bo}`, `${bo} fires it in at the toes`, `${bo} goes full and straight`],
                bouncer:     (bo) => [`${bo} bangs it in short`, `${bo} tests with the bouncer`, `Short and sharp from ${bo}`, `${bo} digs it in`, `Dragged shorter this time by ${bo}`, `${bo} peppers the ribs`, `${bo} fires in the bumper`, `A hostile short ball from ${bo}`],
                full_length: (bo) => [`${bo} pitches it right up`, `${bo} invites the drive`, `Full from ${bo}`, `${bo} goes full and wide`, `Pitched up by ${bo}`, `${bo} dangles it on a length`, `A full delivery from ${bo}`, `${bo} tempts with the full ball`],
                slower_ball: (bo) => [`${bo} takes the pace off`, `A well-disguised slower ball from ${bo}`, `${bo} rolls the fingers over it`, `Change of pace from ${bo}`, `The slower ball from ${bo}`, `${bo} takes something off it`, `Cleverly dipped in pace by ${bo}`, `${bo} holds back the pace`],
                flighted:    (bo) => [`${bo} tosses it up`, `${bo} gives it air`, `Flighted delivery from ${bo}`, `${bo} floats one up invitingly`, `${bo} loops it up`, `A tempting flight from ${bo}`, `${bo} drifts one in with flight`, `Tossed up nicely by ${bo}`],
                googly:      (bo) => [`${bo} slips in the googly`, `The wrong'un from ${bo}`, `${bo} fires in the variation`, `A well-disguised googly from ${bo}`, `${bo} rolls out the wrong'un`, `${bo} spins it the other way`, `The googly from ${bo}`, `${bo} deceives with the googly`],
                generic:     (bo) => [`${bo} comes in and bowls`, `${bo} runs in`, `Into the delivery stride for ${bo}`, `${bo} delivers`]
            },
            timingClauses: {
                perfect:    (ba) => [`${ba} meets it in the perfect window`, `${ba} times it to absolute perfection`, `Perfect timing from ${ba}`, `${ba} picks the length early and nails the timing`, `Right out of the textbook from ${ba}`, `${ba} is right on it`, `${ba} gets into position early and connects perfectly`, `Timed superbly by ${ba}`],
                good:       (ba) => [`${ba} times it solidly`, `A well-timed stroke from ${ba}`, `${ba} reads the length and connects well`, `Solid timing from ${ba}`, `${ba} gets a good read on it`, `${ba} meets it cleanly enough`],
                early:      (ba) => [`${ba} is slightly early into the shot`, `${ba} commits a fraction too soon`, `Just a touch early from ${ba}`, `${ba} is fractionally ahead of the ball`, `${ba} pushes at it a shade early`, `${ba} doesn't quite wait for it`],
                very_early: (ba) => [`${ba} premeditates and swings far too early`, `${ba} commits early and the shot never looks right`, `Way too early from ${ba}`, `${ba} is through the stroke before the ball arrives`, `${ba} lunges forward too soon`, `${ba} charges and swings well ahead of the delivery`, `${ba} goes hard but way too early`, `${ba} throws the bat far too early`],
                late:       (ba) => [`${ba} is hurried and gets the bat down late`, `${ba} is cramped for room and late on the stroke`, `Late on the connection from ${ba}`, `${ba} is rushed by the pace`, `${ba} can't quite get into position in time`, `${ba} plays it a touch late`],
                very_late:  (ba) => [`${ba} is completely rushed for pace`, `${ba} barely gets the bat down in time`, `Very late from ${ba}`, `${ba} is beaten for pace and only just makes contact`, `${ba} is nowhere near the timing on that`, `${ba} is undone by the pace`],
                generic:    (ba) => [`${ba} reacts to the ball`, `${ba} plays at it`, `${ba} goes for the shot`]
            },
            contactClauses: {
                sweet: [`right out of the middle`, `sweet contact`, `middled it beautifully`, `pure connection off the bat face`, `flushed it`, `hit out of the screws`, `nailed it cleanly`, `got hold of it perfectly`],
                clean: [`convincing contact`, `solid connection`, `cleanly struck`, `decent contact off the face`, `met it firmly`, `connected well enough`, `good bat on ball`],
                weak:  [`slices it awkwardly`, `the miscue comes off the toe-end`, `off the splice`, `only a weak connection`, `never gets hold of it`, `checked the shot and it comes off the bat awkwardly`, `off the bottom half of the bat`, `dragged across it`, `a thin connection at best`, `skews it off the face`],
                edge:  [`takes a thick outside edge`, `a faint nick`, `the inside edge intervenes`, `it squirts off the edge`, `nicks it`, `feathers it`, `gets a thick edge`, `deflects off the outside half`, `the ball flies off the splice`],
                miss:  [`misses completely`, `swings over the top of it`, `nowhere near it`, `fails to connect`, `beaten all ends up`, `the bat passes the ball`, `pure air`, `deceived entirely`, `not even close`]
            },
            outcomeClauses: {
                six:    [`and it sails away for a massive six`, `that disappears into the crowd for six`, `maximum! Over the ropes`, `six runs, all the way`, `into the stands for six`, `cleared comfortably for a maximum`],
                four:   [`and it races to the boundary for four`, `that beats the field for four`, `four runs, no need to run`, `to the fence for four`, `boundary! It splits the gap`, `whistles away to the rope for four`],
                wicket: [`and that is the end of the innings for the batter`, `wicket! The bowling side strikes`, `gone! The batter has to walk`, `and that brings a crucial wicket`],
                dot:    [`and no run comes from it`, `dot ball`, `can't get it away`, `no run in the end`, `beaten, no run`, `and the fielder cuts it off, no run`],
                one:    [`and they squeeze out a single`, `nudges one into the gap`, `rotates the strike with a quick single`, `one run, and the strike changes`, `steals a single`, `pushes it away for one`],
                two:    [`and they come back for two`, `hustles through for a couple`, `good running gets them two`, `two runs with sharp calling`, `scampers back for the second`, `they push hard and complete two`],
                three:  [`and they race through for three`, `three runs with excellent running`, `picks up three`],
                runs:   (r) => [`they scramble through for ${r}`, `${r} runs added`, `and they complete ${r} runs`]
            },
            ballPath: {
                boundary: [`it races through the covers`, `splits the gap in the offside`, `threads past the diving fielder`, `pierces the ring field`, `beats the man at the fence`, `screams past the fielder`],
                aerial:   [`it loops into the deep`, `in the air and clears the field`, `high into the sky`, `sails over the infield`, `launches it skyward`],
                ground:   [`it squirts away behind point`, `rolls into the gap`, `drops short of the fielder`, `trickles past the ring`, `dribbles into the offside`],
                dead:     [`goes straight to the fielder`, `finds the man precisely`, `picks out the fielder`, `straight into safe hands`]
            }
        };
    }

    // =========================================================
    // Public API Methods
    // =========================================================

    // Returns an Object: { type: 'ball', lines: [ { speaker, energy, text } ], ball, over, ... }
    generate(ballResult, matchContext, rawBatter, rawBowler) {
        // Safe object destructuring and fallbacks
        const batter = rawBatter || {};
        const bowler = rawBowler || {};
        const context = matchContext || {};
        const result = ballResult || {};
        
        const batterName = batter.name || 'the batter';
        const bowlerName = bowler.name || 'the bowler';

        const event = this.buildEventModel(result, context, batter, bowler, batterName, bowlerName);
        const intent = this.selectIntent(event);

        // Generate lines as objects
        const primary = this.generatePrimaryCall(event, intent);
        const secondary = this.generateSecondaryCall(event, intent);
        const tertiary = this.generateTertiaryCall(event, intent);

        const lines = [primary, secondary, tertiary].filter(Boolean);
        const finalLines = this.dedupeAndFreshenObjects(lines).slice(0, this.maxLinesFromImportance(event.importance));

        this.updateDuelState(event);

        const entry = {
            type: 'ball',
            lines: finalLines, // Array of structured objects
            ball: context.ballInOver || 0,
            over: context.currentOver || 0,
            intent,
            importance: event.importance,
            tags: event.tags
        };

        this.history.unshift(entry);
        if (this.history.length > 50) this.history.pop();

        return entry;
    }

    endOfOverLine(context, rawBowler) {
        const bowler = rawBowler || {};
        const bowlerName = bowler.name || 'the bowler';
        const overNumber = context.currentOver || 0;
        const score = context.score ?? context.totalRuns ?? context.runs ?? 0;
        const wickets = context.wicketsLost ?? context.wickets ?? 0;
        const overRuns = context.runsThisOver;
        
        let pool = [
            `End of the over. Score moves to ${score}/${wickets}.`,
            `The umpire calls over. ${score} for ${wickets}.`,
            `Over number ${overNumber} concludes. ${score}/${wickets} on the board.`
        ];

        if (typeof overRuns === 'number') {
            if (overRuns === 0) pool.push(`A maiden over! Extraordinary control displayed by ${bowlerName}. ${score}/${wickets}.`);
            else if (overRuns <= 3) pool.push(`Just ${overRuns} off the over. The pressure is mounting out there. ${score}/${wickets}.`);
            else if (overRuns >= 12) pool.push(`An expensive over, leaking ${overRuns} runs. Momentum firmly shifts. ${score}/${wickets}.`);
            else pool.push(`${overRuns} runs taken from the over. ${score}/${wickets}.`);
        }

        return {
            type: 'over_break',
            lines: [ { speaker: 'main', energy: 'low', text: this.sanitize(`📋 ${this.pick(pool)}`) } ],
            ball: 6,
            over: overNumber
        };
    }

    abilityTriggered(player, abilityName) {
        const name = player?.name || 'Player';
        const pool = [
            `The complexion alters! ${name} fires up "${abilityName}"!`,
            `${name} unlocks "${abilityName}", you can feel the intensity rise!`,
            `Special ability triggered: ${name} taps into "${abilityName}" at a crucial moment!`
        ];
        return { speaker: 'main', energy: 'high', text: this.sanitize(`⚡ ${this.pick(pool)}`) };
    }

    // =========================================================
    // V2.1 Event Model & Narrative Setup
    // =========================================================

    normalizeEnum(value, fallback = 'generic') {
        return String(value || fallback).replace(/[\s-]+/g, '_').trim().toLowerCase();
    }

    buildEventModel(result, context, batter, bowler, bName, boName) {
        const phase = this.getPhase(context);
        const pressure = this.getPressureLevel(context);
        const dismissalType = this.getDismissalType(result);
        const outcomeType = this.getOutcomeType(result);
        const shotType = this.normalizeEnum(result.shotType, 'shot');
        const deliveryType = this.normalizeEnum(result.deliveryType, 'delivery');
        const contactType = this.normalizeEnum(result.contactType, 'clean');
        const timingDetail = this.normalizeEnum(result.timingDetail, 'good');

        const importance = this.scoreImportance(result, context);
        const tags = [];

        if (result.wicket) tags.push('wicket');
        if (result.six) tags.push('six');
        if (result.boundary) tags.push('boundary');
        if ((result.runs || 0) === 0 && !result.wicket) tags.push('dot');
        if (pressure === 'extreme') tags.push('high_pressure');
        if (phase === 'death') tags.push('death_overs');

        const geography = this.inferShotGeography(shotType);
        const consequence = this.inferConsequence(result, context);
        const styleTags = this.getPlayerStyleTags(batter, bowler);
        const energy = this.getCommentaryEnergy(outcomeType, pressure, result.runs);

        const event = {
            result, context, batter, bowler, 
            batterName: bName, bowlerName: boName,
            phase, pressure, dismissalType, outcomeType,
            shotType, deliveryType, contactType, timingDetail,
            importance, tags, geography, consequence, 
            styleTags, energy
        };

        // Attach setupPayoff after event is built so it can access event properties
        event.setupPayoff = this.inferSetupPayoff(event);

        return event;
    }

    getPhase(context) {
        const over = context.currentOver || 0;
        if (over < 6) return 'powerplay';
        if (over < 16) return 'middle';
        return 'death';
    }

    getPressureLevel(context) {
        let pressure = 0;
        if (context.innings === 2 && context.requiredRunRate != null) {
            if (context.requiredRunRate >= 14) pressure += 3;
            else if (context.requiredRunRate >= 10) pressure += 2;
            else if (context.requiredRunRate >= 8) pressure += 1;
        }
        if ((context.consecutiveDots || 0) >= 3) pressure += 2;
        if ((context.wicketsLost || 0) >= 4) pressure += 1;
        const req = context.runsNeeded ?? 999;
        if (context.innings === 2 && req > 0 && req <= 20) pressure += 2;

        if (pressure >= 5) return 'extreme';
        if (pressure >= 3) return 'high';
        if (pressure >= 1) return 'medium';
        return 'low';
    }

    getCommentaryEnergy(outcomeType, pressure, runs) {
        if (outcomeType === 'wicket' || outcomeType === 'six') return 'high';
        if (pressure === 'extreme' && (outcomeType === 'four' || outcomeType === 'six' || outcomeType === 'wicket')) return 'high';
        if (outcomeType === 'dot' && pressure !== 'extreme') return 'low';
        if ((runs || 0) <= 2) return 'low';
        return 'medium';
    }

    // Fisher-Yates shuffle for robust randomization
    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    getDismissalType(result) {
        const raw = String(result.dismissal || '').toLowerCase().trim();
        if (raw.includes('bowled')) return 'bowled';
        if (raw.includes('caught')) return 'caught';
        if (raw.includes('lbw')) return 'lbw';
        if (raw.includes('run')) return 'run_out';
        if (raw.includes('stump')) return 'stumped';
        if (raw.includes('hit wicket')) return 'hit_wicket';
        return raw || 'generic';
    }

    getOutcomeType(result) {
        if (result.wicket) return 'wicket';
        if (result.six) return 'six';
        if (result.boundary) return 'four';
        if ((result.runs || 0) === 0) return 'dot';
        return 'runs';
    }

    scoreImportance(result, context) {
        let score = 0;
        if (result.wicket) score += 6;
        else if (result.six) score += 5;
        else if (result.boundary) score += 4;
        else if ((result.runs || 0) >= 2) score += 2;

        if (context.innings === 2 && (context.runsNeeded ?? 999) <= 12) score += 3;
        if ((context.requiredRunRate ?? 0) >= 12) score += 2;
        if ((context.consecutiveDots ?? 0) >= 3) score += 2;
        if ((context.consecutiveBoundaries ?? 0) >= 2) score += 2;

        return score;
    }

    getPlayerStyleTags(batter, bowler) {
        let bStyle = [];
        let boStyle = [];
        
        const bType = String(batter?.battingStyle || '').toLowerCase();
        if (bType.includes('power') || bType.includes('aggress')) bStyle.push('power_hitter');
        else if (bType.includes('anchor') || bType.includes('defensive')) bStyle.push('anchor');
        else if (bType.includes('timer') || bType.includes('classical')) bStyle.push('timer');
        else if (bType.includes('improv')) bStyle.push('improviser');
        else if (bType.includes('finish')) bStyle.push('finisher');
        else if (bType) bStyle.push(bType);
        
        const boType = String(bowler?.bowlingStyle || '').toLowerCase();
        if (boType.includes('fast') || boType.includes('pace')) {
            boStyle.push('pace');
            if (boType.includes('swing')) boStyle.push('swing_bowler');
            else if (boType.includes('death')) boStyle.push('death_specialist');
        }
        if (boType.includes('spin')) {
            boStyle.push('spin');
            if (boType.includes('wrist') || boType.includes('leg')) boStyle.push('wrist_spinner');
            else if (boType.includes('finger') || boType.includes('off')) boStyle.push('finger_spinner');
        }
        
        return { batter: bStyle, bowler: boStyle };
    }

    selectIntent(event) {
        if (event.outcomeType === 'wicket') return 'dismissal_drama';
        if (event.outcomeType === 'six') return 'impact_hit';
        if (event.setupPayoff) return 'setup_payoff';
        if (event.consequence === 'equation_shift') return 'match_consequence';
        if (event.pressure === 'extreme') return 'pressure_moment';
        return 'standard_call';
    }

    inferShotGeography(shot) {
        const map = {
            'drive': ['through extra cover', 'past mid off', 'straight down the ground', 'through the covers', 'past the diving mid on', 'punching it wide of cover', 'driving smoothly down town'],
            'cut': ['behind point', 'through backward point', 'square on the off side', 'past the gully', 'slashing it past backward point', 'chopping it fine'],
            'pull': ['behind square leg', 'toward deep backward square', 'into the midwicket pocket', 'splitting the deep square fielders', 'muscled away behind square', 'swiped to the deep midwicket fence'],
            'flick': ['through midwicket', 'wide of mid on', 'behind square on the leg side', 'working away fine', 'tucked off the hip'],
            'lofted': ['over long on', 'over extra cover', 'straight back over the bowler', 'into the stands at deep midwicket', 'clearing the long off boundary', 'sending it high into the V', 'launching it dead straight'],
            'hook': ['fine of deep square', 'over fine leg', 'into the top tier behind square leg', 'helped on its way over the keeper'],
            'slog': ['into the cow corner stands', 'hoicked over midwicket', 'dumped brutally over the leg side', 'heaved across the line'],
            'sweep': ['behind square leg', 'swept fine', 'squaring up the man at deep backward square', 'rolling the wrists past fine leg'],
            'reverse_sweep': ['over short third man', 'past backward point', 'clearing the infield on the off side', 'audaciously flipped past point'],
            'dig_out': ['squirts it into the off side', 'jams it away square', 'digs it out toward point']
        };

        const pool = map[shot];
        return pool ? this.pick(pool) : 'into the gap';
    }

    inferConsequence(result, context) {
        if (context.innings === 2) {
            if (result.boundary || result.six || result.wicket) return 'equation_shift';
            if ((context.runsNeeded ?? 999) <= 12) return 'equation_shift';
            if ((context.requiredRunRate ?? 0) >= 12) return 'escalating_rate';
        }
        if ((context.consecutiveDots ?? 0) >= 3) return 'pressure_build';
        return 'neutral';
    }

    // ── Clause Retrieval Helpers ─────────────────────────────
    getDeliveryClause(deliveryType, bowlerName) {
        const fn = this.PB.deliveryVerbs[deliveryType] || this.PB.deliveryVerbs.generic;
        return this.pick(fn(bowlerName));
    }
    getTimingClause(timingDetail, batterName) {
        const fn = this.PB.timingClauses[timingDetail] || this.PB.timingClauses.generic;
        return this.pick(fn(batterName));
    }
    getContactClause(contactType) {
        return this.pick(this.PB.contactClauses[contactType] || this.PB.contactClauses.clean);
    }
    getOutcomeClause(outcomeType, runs) {
        if (outcomeType === 'runs' || outcomeType === 'dot' || outcomeType === 'four' || outcomeType === 'six' || outcomeType === 'wicket') {
            let key = outcomeType;
            if (key === 'runs') { if (runs === 1) key = 'one'; else if (runs === 2) key = 'two'; else if (runs === 3) key = 'three'; }
            const pool = this.PB.outcomeClauses[key];
            if (typeof pool === 'function') return this.pick(pool(runs));
            return this.pick(pool);
        }
        return `${runs} runs from that`;
    }
    getBallPath(outcomeType, contactType) {
        if (outcomeType === 'six') return this.pick(this.PB.ballPath.aerial);
        if (outcomeType === 'four') return this.pick(this.PB.ballPath.boundary);
        if (outcomeType === 'dot' && contactType === 'clean') return this.pick(this.PB.ballPath.dead);
        return this.pick(this.PB.ballPath.ground);
    }

    // ── Wicket-Specific Templates ──────────────────────────
    buildWicketLines(event) {
        const { batterName, bowlerName, dismissalType, contactType, deliveryType, timingDetail, shotType } = event;
        const deliv = this.getDeliveryClause(deliveryType, bowlerName);
        const timing = this.getTimingClause(timingDetail, batterName);
        const pool = [];

        if (dismissalType === 'bowled') {
            if (contactType === 'miss') {
                pool.push(`${deliv}, ${batterName} ${this.pick(this.PB.contactClauses.miss)}, and the stumps are shattered!`);
                pool.push(`Bowled him! ${bowlerName} cleans up ${batterName} with that ${deliveryType}. ${batterName} ${this.pick(this.PB.contactClauses.miss)}.`);
                pool.push(`${timing}, ${this.pick(this.PB.contactClauses.miss)}, and the timber is disturbed. ${bowlerName} strikes!`);
                pool.push(`Through the gate! ${deliv} and ${batterName} has no answer.`);
            } else if (contactType === 'edge') {
                pool.push(`Chopped on! ${deliv}, ${batterName} gets an inside edge onto the stumps.`);
                pool.push(`Played on! ${timing} against the ${deliveryType}, the inside edge does the damage.`);
                pool.push(`${deliv}, ${batterName} drags the inside edge back onto the woodwork. Gone!`);
            } else {
                pool.push(`OUT! ${deliv} and the stumps are rattled. A wonderful delivery.`);
                pool.push(`${bowlerName} bowls ${batterName} with that ${deliveryType}. Couldn't keep it out.`);
            }
        } else if (dismissalType === 'caught') {
            if (contactType === 'edge') {
                pool.push(`${deliv}, ${timing}, ${this.pick(this.PB.contactClauses.edge)}, and it carries to the fielder. Caught!`);
                pool.push(`Edged and taken! ${deliv}, ${batterName} ${this.pick(['feathers it', 'nicks it', 'gets a thick edge'])} and the catch is held.`);
            } else if (contactType === 'weak' || contactType === 'miss') {
                pool.push(`In the air! ${timing} into the ${shotType}, ${this.pick(this.PB.contactClauses.weak)}, and the fielder takes it safely.`);
                pool.push(`${deliv}, ${batterName} miscues the ${shotType} high into the air, and the catch is taken.`);
                pool.push(`Soft dismissal. ${timing}, never gets hold of the ${shotType}, and it lobs straight to the fielder.`);
            } else {
                pool.push(`Hit straight to the fielder! ${batterName} picks out the man with the ${shotType}.`);
                pool.push(`${deliv}, ${batterName} connects but ${this.pick(this.PB.ballPath.dead)}. Caught!`);
            }
        } else if (dismissalType === 'lbw') {
            pool.push(`${deliv}, ${timing}, ${this.pick(this.PB.contactClauses.miss)}, and trapped in front! LBW!`);
            pool.push(`Huge appeal and given! ${batterName} ${this.pick(this.PB.contactClauses.miss)} against the ${deliveryType}. Dead plumb.`);
            pool.push(`${bowlerName} pins ${batterName} with the ${deliveryType}. Late on the stroke and hit right in front.`);
        } else if (dismissalType === 'stumped') {
            pool.push(`${deliv}, ${batterName} is drawn forward, ${this.pick(this.PB.contactClauses.miss)}, and the keeper whips the bails off!`);
            pool.push(`Beaten in the flight! ${batterName} goes for the ${shotType}, misses, and is stumped.`);
        } else if (dismissalType === 'run_out') {
            pool.push(`Disaster! A mix-up in the running and ${batterName} is run out.`);
            pool.push(`Direct hit and ${batterName} is well short. Run out!`);
        } else {
            pool.push(`WICKET! ${bowlerName} claims ${batterName}. The ${deliveryType} does the trick.`);
        }
        return pool;
    }

    // =========================================================
    // Core Line Generators
    // =========================================================

    // Get archetype-driven verb for batter
    getArchetypeVerb(styleTags, outcomeType) {
        const style = styleTags?.batter?.[0] || '';
        if (outcomeType === 'six' || outcomeType === 'four') {
            if (style === 'power_hitter') return this.pick(['smashes', 'muscles', 'hammers', 'crunches', 'launches']);
            if (style === 'timer') return this.pick(['caresses', 'threads', 'guides', 'eases', 'strokes']);
            if (style === 'anchor') return this.pick(['works', 'pushes', 'nudges', 'places', 'steers']);
            if (style === 'improviser') return this.pick(['manufactures', 'invents', 'improvises', 'flips', 'scoops']);
            if (style === 'finisher') return this.pick(['dispatches', 'finds the gap with', 'picks', 'targets']);
        }
        return this.pick(['plays', 'hits', 'connects with', 'goes for']);
    }

    // Get bowler-archetype-aware description
    getBowlerArchetypeDesc(styleTags, deliveryType) {
        const boStyle = styleTags?.bowler || [];
        if (boStyle.includes('swing_bowler')) return this.pick(['gets it to shape away', 'moves it through the air', 'finds that late swing', 'gets it hooping']);
        if (boStyle.includes('death_specialist')) return this.pick(['executes under pressure', 'nails the yorker length', 'pins the toes', 'hits the blockhole']);
        if (boStyle.includes('wrist_spinner')) return this.pick(['rips it past the bat', 'gets big turn', 'deceives with drift and dip', 'spins it viciously']);
        if (boStyle.includes('finger_spinner')) return this.pick(['slides it on', 'gets it to grip and turn', 'pushes it through quicker', 'drifts it in']);
        return null;
    }

    // Wrap a pool entry with structure + detail metadata
    // detail: 'high' = delivery+shot+timing+contact chain, 'medium' = partial, 'low' = fragment
    S(text, structure, detail) { return { t: text, s: structure, d: detail || 'medium' }; }

    generatePrimaryCall(event, intent) {
        const { outcomeType, batterName, bowlerName, result, geography, dismissalType, shotType, deliveryType, energy, contactType, timingDetail, styleTags } = event;
        const runs = result.runs || 0;

        // Build clauses from phrase banks
        const deliv   = this.getDeliveryClause(deliveryType, bowlerName);
        const timing  = this.getTimingClause(timingDetail, batterName);
        const contact = this.getContactClause(contactType);
        const outcome = this.getOutcomeClause(outcomeType, runs);
        const path    = this.getBallPath(outcomeType, contactType);
        const verb    = this.getArchetypeVerb(styleTags, outcomeType);
        const boDesc  = this.getBowlerArchetypeDesc(styleTags, deliveryType);

        // ── Compatibility guard ──────────────
        const timingIsGood = (timingDetail === 'perfect' || timingDetail === 'good');
        const contactIsClean = (contactType === 'sweet' || contactType === 'clean');
        const safeTiming = (timingIsGood && !contactIsClean) ? this.getTimingClause('good', batterName) : timing;
        const safeContact = (contactIsClean && !timingIsGood && timingDetail !== 'good') ? this.getContactClause('clean') : contact;

        let pool = [];

        // ── WICKETS ──────────────────────────
        if (outcomeType === 'wicket') {
            // buildWicketLines returns plain strings, wrap with structure
            for (const line of this.buildWicketLines(event)) {
                pool.push(this.S(line, 'wicket_call'));
            }
            // Add low-key wicket lines
            pool.push(this.S(`He's got him. ${bowlerName} strikes.`, 'spoken_fragment'));
            pool.push(this.S(`That will do. Breakthrough.`, 'spoken_fragment'));
            pool.push(this.S(`Out. The pressure tells.`, 'spoken_fragment'));
        }
        // ── SIXES ────────────────────────────
        else if (outcomeType === 'six') {
            pool.push(this.S(`${deliv}, ${safeTiming}, ${safeContact}, ${outcome}!`, 'delivery_led', 'high'));
            pool.push(this.S(`${deliv}, and ${batterName} sends it ${geography} for six!`, 'delivery_led', 'high'));
            pool.push(this.S(`${batterName} ${verb} the ${shotType} against the ${deliveryType}, and it flies ${geography} for six!`, 'batter_led', 'high'));
            pool.push(this.S(`${safeTiming} into the ${shotType}, ${outcome}. What a strike!`, 'batter_led', 'high'));
            pool.push(this.S(`Six! ${batterName} ${verb} the ${deliveryType} ${geography}.`, 'outcome_led', 'medium'));
            pool.push(this.S(`Maximum! ${deliv} and ${batterName} has absolutely ${this.pick(['nailed it', 'creamed it', 'sent it into orbit'])}.`, 'outcome_led', 'medium'));
            pool.push(this.S(`That's six. ${batterName} clears the ropes off the ${deliveryType}.`, 'minimal', 'low'));
            pool.push(this.S(`Gone. All the way. ${shotType} off the ${deliveryType} for six.`, 'spoken_fragment', 'low'));
            pool.push(this.S(`Up. Over. Six.`, 'spoken_fragment', 'low'));
        }
        // ── FOURS ────────────────────────────
        else if (outcomeType === 'four') {
            if (contactType === 'edge') {
                pool.push(this.S(`${deliv}, ${contact}, and it streaks to the boundary for four! Lucky runs.`, 'delivery_led', 'high'));
                pool.push(this.S(`Four! But it's off the edge. ${deliv} nearly does the trick, but ${batterName} profits.`, 'outcome_led', 'high'));
                pool.push(this.S(`Streaky boundary! ${batterName} ${contact} and it races past the slips for four.`, 'batter_led', 'high'));
                pool.push(this.S(`Edge. Four. ${bowlerName} won't be happy.`, 'spoken_fragment', 'low'));
            } else if (contactType === 'weak') {
                pool.push(this.S(`${deliv}, ${safeTiming}, ${contact}, but it still finds the gap for four.`, 'delivery_led', 'high'));
                pool.push(this.S(`Not the cleanest from ${batterName}. ${contact} on the ${shotType}, but it trickles to the boundary.`, 'batter_led', 'high'));
                pool.push(this.S(`Miscued. But safe. Four runs.`, 'spoken_fragment', 'low'));
            } else {
                pool.push(this.S(`${deliv}, ${safeTiming}, ${safeContact}, ${outcome}.`, 'delivery_led', 'high'));
                pool.push(this.S(`${deliv}${timingDetail === 'perfect' ? ' and' : ','} ${batterName} ${verb} the ${shotType} ${geography}. Four runs.`, 'delivery_led', 'high'));
                pool.push(this.S(`${batterName} ${verb} the ${shotType} off the ${deliveryType}, and ${path} for four.`, 'batter_led', 'high'));
                pool.push(this.S(`${safeTiming} into the ${shotType}, ${outcome}. Lovely batting.`, 'batter_led', 'high'));
                pool.push(this.S(`Four! ${batterName} finds the boundary ${geography} off the ${deliveryType}.`, 'outcome_led', 'medium'));
                pool.push(this.S(`Boundary! ${deliv}, and ${batterName} has ${this.pick(['timed it superbly', 'dispatched it cleanly', 'placed it perfectly'])}.`, 'outcome_led', 'medium'));
                pool.push(this.S(`To the fence. ${batterName} ${this.pick(['drives', 'cuts', 'pulls', 'flicks', 'glides'])} the ${deliveryType} for four.`, 'minimal', 'low'));
                pool.push(this.S(`Four. Clean. ${geography}.`, 'spoken_fragment', 'low'));
            }
        }
        // ── DOT BALLS ────────────────────────
        else if (outcomeType === 'dot') {
            if (contactType === 'miss') {
                pool.push(this.S(`${deliv}, ${timing}, ${contact}. Dot ball.`, 'delivery_led', 'high'));
                pool.push(this.S(`${deliv} and ${batterName} ${this.pick(this.PB.contactClauses.miss)}. No run.`, 'delivery_led', 'high'));
                pool.push(this.S(`${timing} against the ${deliveryType}. ${bowlerName} wins that exchange.`, 'batter_led', 'high'));
                pool.push(this.S(`Beaten! ${batterName} ${this.pick(['swings past it', 'is through the shot too early', 'never picks it up'])}. Dot ball.`, 'outcome_led', 'medium'));
                pool.push(this.S(`Nothing. Beaten.`, 'spoken_fragment', 'low'));
                pool.push(this.S(`Miss. ${bowlerName} on top.`, 'spoken_fragment', 'low'));
            } else if (contactType === 'weak') {
                pool.push(this.S(`${deliv}, ${timing}, ${contact}. Can't get it away.`, 'delivery_led', 'high'));
                pool.push(this.S(`${batterName} jams out the ${deliveryType} weakly. No run.`, 'batter_led', 'high'));
                pool.push(this.S(`${timing} on the ${shotType}, ${contact}. Dot ball.`, 'batter_led', 'high'));
                pool.push(this.S(`Not timed. But safe.`, 'spoken_fragment', 'low'));
            } else if (contactType === 'edge') {
                pool.push(this.S(`${deliv}, ${contact}, but it drops safely for no run.`, 'delivery_led', 'high'));
                pool.push(this.S(`An edge from ${batterName} against the ${deliveryType}. No damage done.`, 'batter_led', 'high'));
            } else {
                pool.push(this.S(`${deliv}, ${safeTiming}, but ${this.pick(this.PB.ballPath.dead)}. No run.`, 'delivery_led', 'high'));
                pool.push(this.S(`Well bowled. ${batterName} defends the ${deliveryType} solidly.`, 'batter_led', 'medium'));
                pool.push(this.S(`${batterName} blocks the ${deliveryType}. ${this.pick(['Good defensive technique.', 'Solid block.', 'Respecting the bowling.'])}`, 'batter_led', 'medium'));
                pool.push(this.S(`Defended. No run.`, 'spoken_fragment', 'low'));
                pool.push(this.S(`Nothing offered. ${bowlerName} keeps it tight.`, 'spoken_fragment', 'low'));
                pool.push(this.S(`Tidy from ${bowlerName}. No release.`, 'spoken_fragment', 'low'));
            }
        }
        // ── RUNS (1, 2, 3+) — deeply enriched ──
        else {
            if (contactType === 'weak') {
                pool.push(this.S(`${deliv}, ${timing}, ${contact}, but ${this.pick(['they scramble', 'they hustle'])} through for ${runs}.`, 'delivery_led', 'high'));
                pool.push(this.S(`Not cleanly hit, ${contact} off the ${deliveryType}, but ${outcome}.`, 'batter_led', 'high'));
                pool.push(this.S(`Ugly shot. But ${runs === 1 ? 'a run' : runs + ' runs'}.`, 'spoken_fragment', 'low'));
            } else if (contactType === 'edge') {
                pool.push(this.S(`${deliv}, ${contact}, and it squirts away for ${runs}.`, 'delivery_led', 'high'));
                pool.push(this.S(`Off the edge against the ${deliveryType}! ${batterName} ${this.pick(['steals', 'squeezes', 'nicks'])} ${runs === 1 ? 'a single' : runs + ' runs'}.`, 'batter_led', 'high'));
            } else if (runs === 1) {
                pool.push(this.S(`${deliv}, ${safeTiming}, ${outcome}.`, 'delivery_led', 'high'));
                pool.push(this.S(`${batterName} ${this.pick(['nudges', 'works', 'taps', 'glances', 'drops'])} the ${deliveryType} ${geography} for a quick single.`, 'batter_led', 'high'));
                pool.push(this.S(`Soft hands from ${batterName}. Easy single.`, 'batter_led', 'medium'));
                pool.push(this.S(`Just a ${this.pick(['nudge', 'push', 'flick', 'dab'])} into the ${this.pick(['gap', 'leg side', 'off side'])}, and they get one.`, 'batter_led', 'medium'));
                pool.push(this.S(`Strike rotated. ${batterName} ${this.pick(['manipulates', 'works', 'uses'])} the ${shotType} smartly.`, 'outcome_led', 'medium'));
                pool.push(this.S(`That'll do. Single taken.`, 'spoken_fragment', 'low'));
                pool.push(this.S(`One. ${this.pick(['Keeps it ticking.', 'Smart cricket.', 'Strike over.'])}`, 'spoken_fragment', 'low'));
            } else if (runs === 2) {
                pool.push(this.S(`${deliv}, ${safeTiming}, ${outcome}.`, 'delivery_led', 'high'));
                pool.push(this.S(`${batterName} ${this.pick(['works', 'pushes', 'punches', 'clips'])} the ${deliveryType} ${geography}. ${this.pick(['Good running gets them two.', 'They come back for the second.', 'Sharp calling, and they complete two.'])}`, 'batter_led', 'high'));
                pool.push(this.S(`Pushed into the gap. Good running between the wickets for a couple.`, 'outcome_led', 'medium'));
                pool.push(this.S(`Two. Smart running. ${this.pick(['Turned one into two.', 'Alert between the wickets.', 'Pressure on the fielder.'])}`, 'spoken_fragment', 'low'));
            } else {
                pool.push(this.S(`${deliv}, ${safeTiming}, ${outcome}.`, 'delivery_led', 'high'));
                pool.push(this.S(`${batterName} plays the ${shotType} off the ${deliveryType}, ${outcome}.`, 'batter_led', 'high'));
                pool.push(this.S(`${runs} runs. ${batterName} works the ${deliveryType} ${geography}.`, 'outcome_led', 'medium'));
                pool.push(this.S(`${safeTiming} on the ${shotType}. ${this.getOutcomeClause('runs', runs)}.`, 'minimal', 'low'));
            }
        }

        // Phase-aware detail injection: add bowler archetype line for detail richness
        if (boDesc && outcomeType !== 'wicket') {
            pool.push(this.S(`${bowlerName} ${boDesc}. ${batterName} plays the ${shotType}, ${outcome}.`, 'delivery_led', 'high'));
        }

        // Phase-aware overlays for ordinary balls
        if (event.phase === 'powerplay' && (outcomeType === 'dot' || outcomeType === 'runs')) {
            pool.push(this.S(`Powerplay ball. ${deliv}, ${safeTiming}. ${outcome}.`, 'delivery_led', 'high'));
        } else if (event.phase === 'death' && outcomeType === 'dot') {
            pool.push(this.S(`Death overs. ${deliv}, ${batterName} can't get it away. Dot ball.`, 'delivery_led', 'high'));
        } else if (event.phase === 'death' && runs === 1) {
            pool.push(this.S(`Just a single in the death. ${deliv}, ${safeTiming}. ${batterName} can't get under it.`, 'delivery_led', 'high'));
        }

        // Intent-based injections
        if (intent === 'match_consequence' && outcomeType === 'four') {
            pool.unshift(this.S(`Four. That changes the equation. ${batterName} ${verb} the ${deliveryType} ${geography}.`, 'outcome_led', 'high'));
        } else if (intent === 'pressure_moment' && outcomeType === 'dot') {
            pool.unshift(this.S(`Dot ball. The pressure climbs. ${deliv} and ${batterName} can't score.`, 'outcome_led', 'high'));
        }

        // Sort pool: detail-rich lines first, then medium, then low
        const detailOrder = { high: 0, medium: 1, low: 2 };
        pool.sort((a, b) => (detailOrder[a.d] || 1) - (detailOrder[b.d] || 1));

        // Take candidates, more for important events
        const maxCandidates = event.importance >= 5 ? 8 : 5;
        const topDetail = pool.slice(0, Math.max(3, Math.ceil(pool.length * 0.6)));
        const rest = pool.slice(Math.ceil(pool.length * 0.6));
        const shuffled = [...this.shuffle(topDetail), ...this.shuffle(rest)];
        const options = shuffled.slice(0, Math.min(shuffled.length, maxCandidates));

        return { speaker: 'main', energy, textOptions: options.map(o => o.t), structureOptions: options.map(o => o.s), detailOptions: options.map(o => o.d), _event: event };
    }

    // Returns { speaker: 'analyst', energy: 'low', textOptions: [...], structureOptions: [...] }
    generateSecondaryCall(event, intent) {
        const { setupPayoff, consequence, batterName, bowlerName, result, timingDetail, contactType, deliveryType, shotType, phase } = event;

        let pool = [];

        if (intent === 'setup_payoff' && setupPayoff) pool.push(this.S(setupPayoff, 'analyst_setup', 'medium'));

        if (event.outcomeType === 'wicket') {
            if (timingDetail === 'very_early') pool.push(this.S(`Premeditated the swing too early. Can't go hard at the ${deliveryType} without reading the length.`, 'analyst_technical', 'high'));
            else if (timingDetail === 'very_late') pool.push(this.S(`Pure pace did the job. ${batterName} couldn't react to that ${deliveryType} in time.`, 'analyst_technical', 'high'));
            else pool.push(this.S(`That's a big breakthrough. The bowling side earned that.`, 'analyst_reward', 'medium'));
            if (contactType === 'edge') pool.push(this.S(`The ${deliveryType} found the edge. ${bowlerName} had been probing that channel.`, 'analyst_technical', 'high'));
            if (contactType === 'miss') pool.push(this.S(`Complete deception. ${batterName} had no read on the ${deliveryType}.`, 'analyst_technical', 'high'));
            pool.push(this.S(`He'll be disappointed with that. A ${this.pick(['soft', 'careless', 'poor'])} way to go.`, 'analyst_context', 'medium'));
            pool.push(this.S(`${bowlerName} gets the reward. That's what hitting the right areas does.`, 'analyst_reward', 'medium'));
            if (phase === 'death') pool.push(this.S(`Huge in the context of this innings. That wicket could be the difference.`, 'analyst_context', 'medium'));
        }

        else if (intent === 'impact_hit') {
            if (contactType === 'sweet') pool.push(this.S(`Perfectly timed. Pure bat swing, devastating result.`, 'analyst_technical', 'high'));
            else pool.push(this.S(`That changes the over. ${bowlerName} has to rethink now.`, 'analyst_pressure', 'medium'));
            pool.push(this.S(`${batterName} is in the mood. That should worry the bowling side.`, 'analyst_context', 'medium'));
            pool.push(this.S(`Clinical hitting. You don't usually come back from that in a spell.`, 'analyst_pressure', 'medium'));
        }

        else if (consequence === 'equation_shift') {
            pool.push(this.S(`That changes the equation straight away. The chase gets a lift.`, 'analyst_context', 'medium'));
            pool.push(this.S(`Momentum is shifting. The required rate just dropped.`, 'analyst_pressure', 'medium'));
            pool.push(this.S(`The equation looks very different after that boundary.`, 'analyst_context', 'medium'));
        }

        else if (consequence === 'escalating_rate') {
            pool.push(this.S(`These dots are costing. The required rate is climbing.`, 'analyst_pressure', 'medium'));
            pool.push(this.S(`Another dot ball, another tick on the scoreboard pressure.`, 'analyst_pressure', 'medium'));
        }

        else if (event.outcomeType === 'dot') {
            if (contactType === 'miss') {
                pool.push(this.S(`Classic ${deliveryType} bowling. Draws ${batterName} in, then beats him.`, 'analyst_technical', 'high'));
                pool.push(this.S(`Good bowling wins that battle. ${bowlerName} asked the question and got the answer.`, 'analyst_reward', 'medium'));
            }
            else if (timingDetail === 'very_early' || timingDetail === 'early') pool.push(this.S(`The ${deliveryType} held ${batterName} up. Through the shot too early.`, 'analyst_technical', 'high'));
            else if (this.duelState.bowlerOnTopScore >= 3) pool.push(this.S(`${bowlerName} is in complete control. ${batterName} struggling to score.`, 'analyst_pressure', 'medium'));
            else if (this.duelState.consecutiveDots >= 3) {
                pool.push(this.S(`You can see the pressure building on ${batterName} now.`, 'analyst_pressure', 'medium'));
                pool.push(this.S(`${this.duelState.consecutiveDots} dot balls in a row. Something has to give.`, 'analyst_pressure', 'medium'));
            }
        }

        else if (event.outcomeType === 'four') {
            if (this.duelState.bowlerOnTopScore >= 3) pool.push(this.S(`Release shot. ${batterName} needed that after a few quiet balls.`, 'analyst_release', 'medium'));
            else if (contactType === 'edge') pool.push(this.S(`${bowlerName} will feel hard done by. Beat the bat, but the edge found the gap.`, 'analyst_technical', 'high'));
            else {
                const prior = this.duelState.lastBall;
                if (prior && prior.contactType === 'miss') pool.push(this.S(`Beaten last ball, boundary this ball. That's the sign of a quality batter.`, 'analyst_context', 'medium'));
            }
            pool.push(this.S(`Good shot selection there. Read the length early and committed.`, 'analyst_technical', 'high'));
            pool.push(this.S(`That's exactly where you'd want to hit the ${deliveryType}. Textbook.`, 'analyst_technical', 'high'));
        }

        else if (event.outcomeType === 'six') {
            if (timingDetail === 'perfect' && contactType === 'sweet') pool.push(this.S(`That is elite striking. Perfect read, perfect execution.`, 'analyst_technical', 'high'));
            else if (contactType === 'weak') pool.push(this.S(`Didn't quite get hold of it, but it carries. Fortune favours the brave.`, 'analyst_context', 'medium'));
            pool.push(this.S(`${bowlerName} won't want to see that again. That over might need a reset.`, 'analyst_pressure', 'medium'));
            pool.push(this.S(`When ${batterName} hits them like that, the field settings become irrelevant.`, 'analyst_context', 'medium'));
        }

        if (pool.length === 0) return null;
        const shuffled = this.shuffle(pool);
        const options = shuffled.slice(0, 3);
        return { speaker: 'analyst', energy: 'low', textOptions: options.map(o => o.t), structureOptions: options.map(o => o.s), _event: event };
    }

    generateTertiaryCall(event) {
        if (event.importance < 5) return null; 

        const milestone = this.checkMilestones(event.context, event.batter);
        if (milestone) return { speaker: 'main', energy: 'high', text: milestone, _event: event };

        if (event.context.innings === 2 && (event.context.runsNeeded ?? 999) <= 10) {
            return { speaker: 'main', energy: 'medium', text: `Just ${event.context.runsNeeded} needed now. This is going to be tight.`, _event: event };
        }

        return null;
    }

    // =========================================================
    // Modifiers & Duel State Management
    // =========================================================

    // ── State update ─────────────────────────────────────
    updateDuelState(event) {
        const { outcomeType, contactType } = event;

        if (outcomeType === 'dot') {
            this.duelState.consecutiveDots++;
            this.duelState.consecutiveBoundaries = 0;
        } else if (outcomeType === 'four' || outcomeType === 'six') {
            this.duelState.consecutiveBoundaries++;
            this.duelState.consecutiveDots = 0;
        } else {
            this.duelState.consecutiveDots = 0;
            this.duelState.consecutiveBoundaries = 0;
        }

        if (contactType === 'miss' || contactType === 'edge' || contactType === 'weak') {
            this.duelState.falseShotsSinceBoundary++;
        } else {
            this.duelState.falseShotsSinceBoundary = 0;
        }

        if (outcomeType === 'dot' && (contactType === 'miss' || contactType === 'edge')) {
            this.duelState.bowlerOnTopScore++;
        } else if (outcomeType === 'four' || outcomeType === 'six') {
            this.duelState.bowlerOnTopScore = Math.max(0, this.duelState.bowlerOnTopScore - 2);
        } else {
            this.duelState.bowlerOnTopScore = Math.max(0, this.duelState.bowlerOnTopScore - 1);
        }

        this.duelState.lastBall = { outcomeType, contactType };
    }

    inferSetupPayoff(event) {
        const dots = this.duelState.consecutiveDots;
        const boundaries = this.duelState.consecutiveBoundaries;
        const bowlerTop = this.duelState.bowlerOnTopScore;
        const falseShots = this.duelState.falseShotsSinceBoundary;

        const lines = [];

        if (dots >= 4 && (event.outcomeType === 'four' || event.outcomeType === 'six')) {
            lines.push(`After a few quiet balls, ${event.batterName} finally found the release shot.`);
            lines.push(`Classic double bluff. Full last ball, short this time.`);
        }

        if (boundaries >= 2 && event.outcomeType === 'dot') {
            lines.push(`After consecutive boundaries, ${event.bowlerName} regroups and fires back.`);
        }

        if (bowlerTop >= 4 && event.outcomeType === 'wicket') {
            lines.push(`${event.bowlerName} had been testing ${event.batterName} for a few balls, and the breakthrough is the reward.`);
        }

        if (falseShots >= 3 && event.outcomeType === 'wicket') {
            lines.push(`The signs were all there. ${event.batterName} had been beaten multiple times before that dismissal arrived.`);
        }

        return lines.length > 0 ? this.pick(lines) : null;
    }

    // Milestone checker
    checkMilestones(context, batter) {
        const runs = context.currentBatterRuns || 0;
        const bId = batter?.id || 'unknown';
        const bName = batter?.name || 'Batter';

        if (runs >= 50 && !this.milestones.has(`${bId}_50`)) {
            this.milestones.add(`${bId}_50`);
            return `\ud83c\udf89 That brings up a fine fifty for ${bName}.`;
        }

        if (runs >= 100 && !this.milestones.has(`${bId}_100`)) {
            this.milestones.add(`${bId}_100`);
            return `\ud83d\udcaf Century for ${bName}! A magnificent innings.`;
        }

        return null;
    }

    maxLinesFromImportance(score) {
        if (score >= 7) return 3;
        if (score >= 4) return 2;
        return 1;
    }

    pick(arr) {
        if (!arr || !arr.length) return '';
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // Clean final output: underscores to spaces, strip em/en dashes
    sanitize(text) {
        if (!text) return text;
        return text
            .replace(/_/g, ' ')
            .replace(/[\u2014\u2013]/g, ',')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    rememberText(text) {
        if (!text) return;
        this.recentExactTexts.unshift(text);
        if (this.recentExactTexts.length > this.maxRecentMemory) this.recentExactTexts.pop();
    }
    rememberSig(sig) {
        if (!sig) return;
        this.recentSemanticSigs.unshift(sig);
        if (this.recentSemanticSigs.length > this.maxRecentMemory) this.recentSemanticSigs.pop();
    }

    getSemanticSignatureFromEvent(text, event, obj) {
        if (!event) return text.toLowerCase();
        return [
            obj.speaker,
            event.outcomeType,
            event.shotType,
            event.deliveryType,
            event.contactType,
            event.timingDetail,
            event.phase,
            obj.structure || 'generic'
        ].join('|');
    }

    // Normalize opening ignoring player names for structural freshness
    normalizeOpening(text, event) {
        let norm = text;
        if (event) {
            if (event.batterName) norm = norm.replace(new RegExp(event.batterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), 'BATTER');
            if (event.bowlerName) norm = norm.replace(new RegExp(event.bowlerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), 'BOWLER');
        }
        return norm.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
    }

    // Score a candidate: higher = better pick. Combine detail priority + freshness + structure diversity.
    scoreCandidate(text, structure, detail, speaker, event) {
        let score = 0;

        // Detail richness bonus: the user wants detail-rich lines to appear more often
        if (detail === 'high') score += 4;
        else if (detail === 'medium') score += 2;
        else score += 0;

        // Freshness: penalize stale candidates
        const sanitized = this.sanitize(text).trim().toLowerCase();
        if (this.recentExactTexts.includes(sanitized)) score -= 10;

        const sig = event ? this.getSemanticSignatureFromEvent(text, event, { speaker, structure }) : sanitized;
        if (this.recentSemanticSigs.includes(sig)) score -= 8;

        const opening = this.normalizeOpening(text, event);
        if (this.recentOpenings.includes(opening)) score -= 5;

        // Per-speaker structure diversity
        const speakerStructures = this.recentStructures[speaker] || [];
        if (speakerStructures.includes(structure)) score -= 6;

        // Small random jitter to prevent deterministic ordering
        score += Math.random() * 1.5;

        return { score, sig, sanitized, opening, structure };
    }

    dedupeAndFreshenObjects(lineObjects) {
        const out = [];

        for (const obj of lineObjects) {
            if (!obj) continue;

            const options = obj.textOptions ? obj.textOptions : (obj.text ? [obj.text] : []);
            const structures = obj.structureOptions || [];
            const details = obj.detailOptions || [];
            const event = obj._event || null;
            const speaker = obj.speaker || 'main';

            // Score all candidates and pick the best
            let best = null;
            for (let i = 0; i < options.length; i++) {
                const text = options[i];
                const structure = structures[i] || 'generic';
                const detail = details[i] || 'medium';
                const result = this.scoreCandidate(text, structure, detail, speaker, event);
                if (result.score <= -5) continue; // Hard reject very stale candidates
                if (!best || result.score > best.score) {
                    best = { ...result, text, detail };
                }
            }

            // If all scored too low, fall back to first option
            if (!best && options.length > 0) {
                const text = options[0];
                const sanitized = this.sanitize(text).trim().toLowerCase();
                best = {
                    text,
                    score: -999,
                    sig: sanitized,
                    sanitized,
                    opening: this.normalizeOpening(text, event),
                    structure: structures[0] || 'generic',
                    detail: details[0] || 'medium'
                };
            }

            if (best) {
                this.rememberSig(best.sig);
                this.rememberText(best.sanitized);
                // Track opening words (name-normalized)
                this.recentOpenings.unshift(best.opening);
                if (this.recentOpenings.length > this.maxRecentOpenings) this.recentOpenings.pop();
                // Track per-speaker structure family
                const speakerKey = speaker;
                if (!this.recentStructures[speakerKey]) this.recentStructures[speakerKey] = [];
                this.recentStructures[speakerKey].unshift(best.structure);
                if (this.recentStructures[speakerKey].length > this.maxRecentStructures) this.recentStructures[speakerKey].pop();

                out.push({ speaker, energy: obj.energy, text: this.sanitize(best.text) });
            }
        }

        if (out.length === 0 && lineObjects.length > 0) {
             out.push({ speaker: 'main', energy: 'low', text: this.sanitize('That is the result of the delivery.')});
        }

        return out;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommentarySystem };
}
