// ============================================================
// CRICKET LEGENDS — Dynamic Commentary System
// Backward-compatible rewrite
// ============================================================

class CommentarySystem {
    constructor() {
        this.history = [];
        this.milestones = new Set();
        this.recentLineMemory = [];
        this.maxRecentMemory = 30;
    }

    // =========================================================
    // Public API
    // =========================================================

    generate(ballResult, matchContext, batter, bowler) {
        const lines = [];

        const intro = this.shouldUseDeliveryIntro(ballResult, matchContext)
            ? this.deliveryLine(ballResult, bowler, batter, matchContext)
            : null;

        if (intro) lines.push(intro);

        if (ballResult.wicket) {
            lines.push(this.wicketLine(ballResult, batter, bowler, matchContext));
        } else if (ballResult.six) {
            lines.push(this.sixLine(ballResult, batter, bowler, matchContext));
        } else if (ballResult.boundary) {
            lines.push(this.fourLine(ballResult, batter, bowler, matchContext));
        } else if ((ballResult.runs || 0) === 0) {
            lines.push(this.dotLine(ballResult, batter, bowler, matchContext));
        } else {
            lines.push(this.runLine(ballResult, batter, bowler, matchContext));
        }

        const milestoneLine = this.checkMilestones(matchContext, batter);
        if (milestoneLine) lines.push(milestoneLine);

        const pressureLine = this.pressureLine(matchContext, batter, bowler, ballResult);
        if (pressureLine) lines.push(pressureLine);

        const momentumLine = this.momentumLine(matchContext, batter, bowler, ballResult);
        if (momentumLine) lines.push(momentumLine);

        const phaseLine = this.phaseLine(matchContext, ballResult, batter, bowler);
        if (phaseLine) lines.push(phaseLine);

        const maxLines = this.getMaxLinesForBall(ballResult, matchContext);
        const finalLines = this.dedupeAndFreshen(lines).slice(0, maxLines);

        const entry = {
            type: 'ball',
            lines: finalLines,
            ball: matchContext.ballInOver,
            over: matchContext.currentOver
        };

        this.history.unshift(entry);
        if (this.history.length > 40) this.history.pop();

        return entry;
    }

    endOfOverLine(context, bowler) {
        const overNumber = context.currentOver;
        const score = context.score ?? context.totalRuns ?? context.runs ?? 0;
        const wickets = context.wicketsLost ?? context.wickets ?? 0;
        const overRuns = context.runsThisOver;
        const narrative = this.inferMatchNarrative(context);

        let lines = [
            `📋 End of over ${overNumber}. Score ${score}/${wickets}.`,
            `📋 Over ${overNumber} complete. The batting side moves to ${score}/${wickets}.`,
            `📋 ${overNumber} overs gone now, and it is ${score}/${wickets}.`,
            `📋 That is the end of over ${overNumber}. ${score}/${wickets} on the board.`,
            `📋 Over ${overNumber} done. The score reads ${score}/${wickets}.`,
            `📋 End of the over. ${score}/${wickets} after ${overNumber}.`
        ];

        if (typeof overRuns === 'number') {
            lines = lines.concat([
                `📋 End of over ${overNumber}. ${overRuns} from it. Score ${score}/${wickets}.`,
                `📋 Over ${overNumber} complete, ${overRuns} coming from that over. ${score}/${wickets}.`,
                `📋 ${overRuns} off the over. The score advances to ${score}/${wickets}.`,
                `📋 That over costs ${overRuns}. The batting side is now ${score}/${wickets}.`
            ]);
        }

        if (narrative === 'onslaught') {
            lines = lines.concat([
                `📋 A punishing over for ${bowler.name}. Momentum is firmly with the batting side.`,
                `📋 That over belonged entirely to the batters. ${bowler.name} was under pressure throughout.`,
                `📋 The batting side has taken a clear step forward there.`
            ]);
        }

        if (narrative === 'squeeze') {
            lines = lines.concat([
                `📋 A disciplined over, and the fielding side will be pleased with that control.`,
                `📋 The pressure continues to build. That was a tight over from ${bowler.name}.`,
                `📋 Not much breathing room in that over. Smart defensive cricket.`
            ]);
        }

        return {
            type: 'over_break',
            lines: [this.ensureFreshLine(this.pick(lines))],
            ball: 6,
            over: overNumber
        };
    }

    abilityTriggered(player, abilityName) {
        const lines = [
            `⚡ ${player.name}'s "${abilityName}" ability is now active!`,
            `⚡ ${player.name} activates "${abilityName}" and the intensity rises immediately!`,
            `⚡ Special ability triggered: ${player.name} unlocks "${abilityName}"!`,
            `⚡ ${player.name} taps into "${abilityName}" right on cue!`,
            `⚡ A surge from ${player.name}. "${abilityName}" is live now!`,
            `⚡ ${player.name} has entered a different mode. "${abilityName}" is active!`,
            `⚡ Momentum spike. ${player.name}'s "${abilityName}" has kicked in!`,
            `⚡ Big moment here, ${player.name} switches on "${abilityName}"!`
        ];
        return this.ensureFreshLine(this.pick(lines));
    }

    // =========================================================
    // Core Helpers
    // =========================================================

    pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    maybe(chance = 0.5) {
        return Math.random() < chance;
    }

    formatRuns(runs) {
        return `${runs} run${runs === 1 ? '' : 's'}`;
    }

    rememberLine(line) {
        if (!line) return;
        this.recentLineMemory.unshift(line);
        if (this.recentLineMemory.length > this.maxRecentMemory) {
            this.recentLineMemory.pop();
        }
    }

    ensureFreshLine(line) {
        if (!line) return null;

        if (!this.recentLineMemory.includes(line)) {
            this.rememberLine(line);
            return line;
        }

        const suffixes = [
            ` The crowd reacts immediately.`,
            ` That shifts the mood out there.`,
            ` You can sense the tension changing.`,
            ` The fielding side feels that one.`,
            ` That lands heavily in this contest.`,
            ` A telling moment in the game.`,
            ` The noise around the ground rises.`,
            ` That changes the emotional temperature of the match.`
        ];

        const fresh = line + this.pick(suffixes);
        this.rememberLine(fresh);
        return fresh;
    }

    dedupeAndFreshen(lines) {
        const seen = new Set();
        const out = [];

        for (const line of lines) {
            if (!line) continue;
            const normalized = line.trim().toLowerCase();
            if (seen.has(normalized)) continue;
            seen.add(normalized);
            out.push(this.ensureFreshLine(line));
        }

        return out;
    }

    getPhase(context) {
        const over = context.currentOver || 0;
        if (over < 6) return 'powerplay';
        if (over < 16) return 'middle';
        return 'death';
    }

    getPressureLevel(context) {
        let pressure = 0;

        if (context.innings === 2 && context.requiredRunRate) {
            if (context.requiredRunRate >= 14) pressure += 3;
            else if (context.requiredRunRate >= 10) pressure += 2;
            else if (context.requiredRunRate >= 8) pressure += 1;
        }

        if ((context.consecutiveDots || 0) >= 3) pressure += 2;
        if ((context.wicketsLost || 0) >= 4) pressure += 1;
        if (context.runsNeeded !== null && context.runsNeeded !== undefined && context.runsNeeded <= 20) pressure += 2;

        if (pressure >= 5) return 'extreme';
        if (pressure >= 3) return 'high';
        if (pressure >= 1) return 'medium';
        return 'low';
    }

    inferBatterState(context) {
        const runs = context.currentBatterRuns || 0;
        const balls = context.currentBatterBalls || 0;
        const sr = balls > 0 ? runs / balls : 0;

        if (runs >= 70) return 'dominant';
        if (sr >= 1.7) return 'explosive';
        if (balls >= 12 && sr < 0.8) return 'restless';
        if (balls <= 5) return 'settling';
        return 'composed';
    }

    inferMatchNarrative(context) {
        if (context.innings === 2 && context.runsNeeded !== null && context.runsNeeded !== undefined) {
            if (context.runsNeeded <= 10) return 'finish_line';
            if ((context.requiredRunRate || 0) >= 12) return 'climb';
            if ((context.requiredRunRate || 99) <= 7) return 'under_control';
        }

        if ((context.consecutiveBoundaries || 0) >= 3) return 'onslaught';
        if ((context.consecutiveDots || 0) >= 4) return 'squeeze';
        if ((context.wicketsLost || 0) >= 5) return 'collapse_threat';

        return 'neutral';
    }

    getMaxLinesForBall(result, context) {
        if (result.wicket) return 3;
        if (result.six) return 3;
        if (result.boundary) return 2;
        if ((context.runsNeeded || 999) <= 10) return 3;
        return 2;
    }

    shouldUseDeliveryIntro(result, context) {
        const specialBalls = new Set([
            'yorker',
            'bouncer',
            'slower_ball',
            'inswing',
            'outswing',
            'doosra',
            'googly',
            'flighted',
            'arm_ball',
            'top_spinner'
        ]);

        if (result.wicket) return true;
        if (result.six || result.boundary) return true;
        if (specialBalls.has(result.deliveryType)) return true;
        if (this.getPressureLevel(context) === 'extreme') return true;

        return this.maybe(0.18);
    }

    getDismissalType(result) {
        const raw = (result.dismissal || '').toLowerCase().trim();

        if (raw.includes('bowled')) return 'bowled';
        if (raw.includes('caught')) return 'caught';
        if (raw.includes('lbw')) return 'lbw';
        if (raw.includes('run')) return 'run_out';
        if (raw.includes('stump')) return 'stumped';
        if (raw.includes('hit wicket')) return 'hit_wicket';

        return raw || 'generic';
    }

    // =========================================================
    // Delivery Commentary
    // =========================================================

    deliveryLine(result, bowler, batter, context) {
        const type = result.deliveryType;
        const phase = this.getPhase(context);
        const pressure = this.getPressureLevel(context);

        const templates = {
            yorker: [
                `${bowler.name} nails the yorker, right at the base of the stumps.`,
                `${bowler.name} goes full and flat, aiming for the blockhole.`,
                `A searing yorker from ${bowler.name}.`,
                `${bowler.name} spears it in at yorker length.`,
                `Deadly full from ${bowler.name}, almost unhittable if executed right.`,
                `${bowler.name} attacks the toes with a sharp yorker.`,
                `Full, fast, and right in the danger zone from ${bowler.name}.`,
                `${bowler.name} commits to the yorker under pressure.`,
                `A blockhole special from ${bowler.name}.`,
                `${bowler.name} goes searching for the perfect yorker.`
            ],
            bouncer: [
                `${bowler.name} bangs it in short and climbs into the batter.`,
                `A sharp bouncer from ${bowler.name}, rising awkwardly.`,
                `${bowler.name} goes hostile with the short ball.`,
                `Short, steep, and aimed to unsettle from ${bowler.name}.`,
                `${bowler.name} tests the batter's courage with a bouncer.`,
                `That one climbs from a hard length, courtesy of ${bowler.name}.`,
                `${bowler.name} digs it in and asks a serious question.`,
                `A heavy short ball from ${bowler.name}.`,
                `${bowler.name} goes upstairs with intent.`,
                `The batter is forced onto the back foot by ${bowler.name}.`
            ],
            good_length: [
                `${bowler.name} lands it on a nagging good length.`,
                `That is the testing area from ${bowler.name}.`,
                `${bowler.name} hits the seam-perfect channel.`,
                `A disciplined good length delivery from ${bowler.name}.`,
                `${bowler.name} keeps it right in the uncomfortable zone.`,
                `Good length, good control, good pressure from ${bowler.name}.`,
                `${bowler.name} finds that awkward length again.`,
                `That is a thoughtful ball from ${bowler.name}.`,
                `${bowler.name} keeps probing just outside certainty.`,
                `A proper question asked by ${bowler.name}.`
            ],
            full_length: [
                `${bowler.name} pitches it right up and invites the drive.`,
                `Full from ${bowler.name}, daring the batter to commit.`,
                `${bowler.name} goes searching for swing with a fuller ball.`,
                `Pitched up by ${bowler.name}.`,
                `${bowler.name} tempts the batter onto the front foot.`,
                `That is invitingly full from ${bowler.name}.`,
                `${bowler.name} pushes it up there in search of movement.`,
                `A fuller length from ${bowler.name}, very hittable if overpitched.`,
                `${bowler.name} attacks with the fuller option.`,
                `Right up in the driving arc from ${bowler.name}.`
            ],
            slower_ball: [
                `${bowler.name} takes the pace off cleverly.`,
                `Change of pace from ${bowler.name}, disguised late.`,
                `${bowler.name} rolls the fingers over it.`,
                `That is the slower variation from ${bowler.name}.`,
                `${bowler.name} smartly pulls the pace away from the batter.`,
                `Off-cutter style variation from ${bowler.name}.`,
                `${bowler.name} relies on deception here.`,
                `A well-concealed slower ball from ${bowler.name}.`,
                `${bowler.name} breaks the rhythm with reduced pace.`,
                `The batter has to wait on that one from ${bowler.name}.`
            ],
            inswing: [
                `${bowler.name} bends it back in late.`,
                `A late in-swinger from ${bowler.name}.`,
                `${bowler.name} brings it sharply into the pads.`,
                `That tails in beautifully from ${bowler.name}.`,
                `Lovely late inward movement from ${bowler.name}.`,
                `${bowler.name} shapes it back toward the stumps.`,
                `A dangerous in-swinger from ${bowler.name}.`,
                `${bowler.name} attacks the inside edge with movement.`,
                `That curves back from ${bowler.name}.`,
                `${bowler.name} gets the ball talking inward.`
            ],
            outswing: [
                `${bowler.name} shapes it away late from the batter.`,
                `Lovely away movement from ${bowler.name}.`,
                `${bowler.name} gets it to leave the batter.`,
                `That angles across and keeps moving from ${bowler.name}.`,
                `A classic outswinger from ${bowler.name}.`,
                `${bowler.name} drags the batter wider with movement.`,
                `That tempts and then escapes from ${bowler.name}.`,
                `${bowler.name} finds late shape away from the bat.`,
                `Beautiful seam and swing from ${bowler.name}.`,
                `${bowler.name} makes the batter follow the ball outside off.`
            ],
            stock: [
                `${bowler.name} goes back to the stock ball.`,
                `Nothing fancy, just ${bowler.name} trusting the basics.`,
                `${bowler.name} keeps it simple with the stock delivery.`,
                `That is ${bowler.name}'s default option.`,
                `${bowler.name} resets with the reliable ball.`,
                `Back to the bread-and-butter delivery for ${bowler.name}.`,
                `${bowler.name} trusts the standard line and length.`,
                `The stock ball from ${bowler.name}, delivered with control.`,
                `${bowler.name} returns to the fundamental option.`,
                `A no-nonsense delivery from ${bowler.name}.`
            ],
            doosra: [
                `${bowler.name} slips in the doosra.`,
                `The doosra from ${bowler.name} turns the other way.`,
                `${bowler.name} uses the variation to deceive the batter.`,
                `That is the doosra, and the batter has to pick it early.`,
                `${bowler.name} goes for the mystery option.`,
                `A deceptive doosra from ${bowler.name}.`,
                `${bowler.name} changes the direction of spin.`,
                `That one behaves differently off the hand from ${bowler.name}.`,
                `${bowler.name} goes for disguise and drift.`,
                `The wrong-direction spinner from ${bowler.name}.`
            ],
            googly: [
                `${bowler.name} fires in the googly.`,
                `Wrong'un from ${bowler.name}.`,
                `${bowler.name} disguises the googly nicely.`,
                `The batter has to read that out of the hand, it is the googly from ${bowler.name}.`,
                `${bowler.name} flips the script with the wrong'un.`,
                `That turns the unexpected way from ${bowler.name}.`,
                `${bowler.name} goes to the googly at an important moment.`,
                `A teasing googly from ${bowler.name}.`,
                `${bowler.name} changes the angle of the contest with the googly.`,
                `The variation is out from ${bowler.name}.`
            ],
            flighted: [
                `${bowler.name} tosses it up and invites risk.`,
                `Plenty of air on that from ${bowler.name}.`,
                `${bowler.name} gives it flight and temptation.`,
                `Loop and drift from ${bowler.name}.`,
                `${bowler.name} dares the batter to step out.`,
                `That is wonderfully teased up by ${bowler.name}.`,
                `${bowler.name} slows the moment down with flight.`,
                `A hanging invitation from ${bowler.name}.`,
                `${bowler.name} lets it float into the batter's decision.`,
                `That is the artful, teasing version from ${bowler.name}.`
            ],
            arm_ball: [
                `${bowler.name} skids the arm ball through.`,
                `The arm ball from ${bowler.name} goes on with the angle.`,
                `${bowler.name} hurries that one straight through.`,
                `That is the quicker arm ball from ${bowler.name}.`,
                `${bowler.name} removes spin and adds skid.`,
                `A darting arm ball from ${bowler.name}.`,
                `${bowler.name} slides it on without turn.`,
                `That one stays true from ${bowler.name}.`,
                `${bowler.name} surprises the batter with the straighter one.`,
                `The arm ball zips through from ${bowler.name}.`
            ],
            top_spinner: [
                `${bowler.name} rips in the top-spinner for extra bounce.`,
                `Top-spinner from ${bowler.name}, and that one kicks.`,
                `${bowler.name} gets overspin and lift.`,
                `That climbs more than expected from ${bowler.name}.`,
                `${bowler.name} forces bounce with the top-spinner.`,
                `A jumping spinner from ${bowler.name}.`,
                `${bowler.name} uses overspin to challenge the batter.`,
                `That is the bouncing variation from ${bowler.name}.`,
                `${bowler.name} extracts awkward lift there.`,
                `The top-spinner from ${bowler.name} threatens off the surface.`
            ]
        };

        let pool = templates[type] || [
            `${bowler.name} begins the approach.`,
            `${bowler.name} comes in for the next ball.`,
            `Here is ${bowler.name} once more.`,
            `${bowler.name} runs in again.`,
            `${bowler.name} prepares for the next delivery.`,
            `${bowler.name} starts the run-up.`,
            `${bowler.name} is in again now.`,
            `Back comes ${bowler.name}.`,
            `${bowler.name} charges in.`,
            `${bowler.name} sets off for the next ball.`
        ];

        if (phase === 'death' && this.maybe(0.35)) {
            pool = pool.concat([
                `${bowler.name} has almost no room for error in the death overs.`,
                `This is a pressure delivery for ${bowler.name}.`,
                `${bowler.name} knows one miss here can cost dearly.`,
                `The field is back and the margin is tiny for ${bowler.name}.`,
                `At this stage, execution is everything for ${bowler.name}.`
            ]);
        }

        if (pressure === 'extreme' && this.maybe(0.3)) {
            pool = pool.concat([
                `The tension around this ball is unmistakable.`,
                `One mistake here could swing the whole contest.`,
                `This moment is heavier than an ordinary delivery.`,
                `There is real nervous energy around the ground.`,
                `Both players know the importance of this ball.`
            ]);
        }

        return this.pick(pool);
    }

    // =========================================================
    // Outcome Commentary
    // =========================================================

    wicketLine(result, batter, bowler, context) {
        const dismissalType = this.getDismissalType(result);
        const dismissalText = result.dismissal || 'is out';
        const phase = this.getPhase(context);
        const narrative = this.inferMatchNarrative(context);

        let pool = [
            `OUT! ${batter.name} ${dismissalText}! ${bowler.name} gets the breakthrough!`,
            `WICKET! ${batter.name} is gone, and ${bowler.name} has delivered a massive blow!`,
            `${bowler.name} strikes! ${batter.name} has to walk back!`,
            `That is a huge moment in the match. ${batter.name} departs!`,
            `Gone! ${bowler.name} wins the duel and the fielding side erupts!`,
            `${batter.name} is out, and ${bowler.name} has changed the mood of the game!`,
            `Breakthrough for ${bowler.name}! ${batter.name} cannot continue!`,
            `The bowling side has what it wanted. ${batter.name} is dismissed!`,
            `Big wicket! ${batter.name} falls at a critical time!`,
            `${bowler.name} makes the breakthrough and the celebration says everything!`
        ];

        const byType = {
            bowled: [
                `Bowled him! ${batter.name} is beaten completely and the stumps are shattered!`,
                `Cleaned up! ${batter.name} plays all around it!`,
                `Through the gate! ${bowler.name} has ripped out the furniture!`,
                `The castle has been breached. ${batter.name} is bowled!`,
                `${batter.name} misses, and the stumps do not!`,
                `What a ball. ${batter.name} is beaten and bowled!`,
                `That sneaks through and demolishes the stumps!`,
                `${bowler.name} goes straight through the defense!`,
                `No answer from ${batter.name}. Bowled!`,
                `The timber is disturbed, and ${batter.name} is gone!`
            ],
            caught: [
                `Taken! ${batter.name} holes out and pays the price!`,
                `In the air and safely held! ${batter.name} is gone!`,
                `That hangs up long enough, and the fielder makes no mistake!`,
                `Safe hands complete the chance, and ${batter.name} departs!`,
                `Mistimed, airborne, and caught!`,
                `${batter.name} cannot clear the fielder this time!`,
                `Straight to hand, and that is a simple but important catch!`,
                `The pressure tells, and ${batter.name} picks out the man!`,
                `He has hit it, but not well enough. Caught!`,
                `That was always catchable, and it has been taken cleanly!`
            ],
            lbw: [
                `Huge shout, finger raised! ${batter.name} is trapped in front!`,
                `Plumb! ${batter.name} is pinned right in line!`,
                `That looked straight away, and the umpire agrees!`,
                `Dead in front, and ${batter.name} has to go!`,
                `${bowler.name} wins the appeal, and it is a massive wicket!`,
                `No escape for ${batter.name} there, caught on the crease!`,
                `That thuds into the pad and the verdict is out!`,
                `The appeal is loud and the answer is immediate. Out!`,
                `Pinned in front of the stumps, and ${batter.name} is gone!`,
                `A classic lbw dismissal, and ${bowler.name} is delighted!`
            ],
            run_out: [
                `Run out! Confusion in the middle and ${batter.name} is punished!`,
                `Direct hit pressure and ${batter.name} is stranded short!`,
                `Disaster in the running. ${batter.name} has to go!`,
                `A mix-up proves fatal, and ${batter.name} is run out!`,
                `That is a gift for the fielding side, and they accept it!`,
                `There was hesitation, then panic, and now the wicket is gone!`,
                `${batter.name} is short of the crease and the fielding side celebrates!`,
                `Sharp work in the field turns this into a run out!`,
                `No coordination, no safety, and no wicket left for ${batter.name}!`,
                `The pressure creates a mistake, and the run out is complete!`
            ],
            stumped: [
                `Beaten in flight and stumped smartly! ${batter.name} is gone!`,
                `Excellent work by the keeper. ${batter.name} is stranded!`,
                `${batter.name} advanced, missed, and pays the price!`,
                `Out of the crease, out of control, and out of the game!`,
                `What sharp glovework that is, ${batter.name} is stumped!`,
                `The batter was lured out beautifully and finished off neatly!`,
                `${bowler.name} deceives, the keeper completes, wicket falls!`,
                `Quick hands behind the stumps and ${batter.name} is beaten!`,
                `That is lovely spinner-keeper teamwork!`,
                `${batter.name} lost the crease for a moment and that was enough!`
            ],
            hit_wicket: [
                `Hit wicket! ${batter.name} has done the damage alone!`,
                `Unbelievable scenes, ${batter.name} drags onto the stumps!`,
                `In trying to play the shot, ${batter.name} has disturbed the stumps!`,
                `That is a rare way to go, hit wicket for ${batter.name}!`,
                `${batter.name} loses balance and loses the wicket with it!`
            ],
            generic: [
                `${batter.name} is dismissed, and the bowling side breaks through!`,
                `${bowler.name} claims the wicket, whatever the route, the result is the same!`,
                `The breakthrough is here, and ${batter.name} has to go!`
            ]
        };

        pool = pool.concat(byType[dismissalType] || byType.generic);

        if (phase === 'death') {
            pool = pool.concat([
                `A wicket in the death overs is pure gold for the bowling side.`,
                `That could be worth far more than one wicket at this stage.`,
                `At the death, dismissals change overs and matches in a hurry.`,
                `That is a priceless strike in the closing phase.`,
                `The fielding side could not have asked for a better moment to strike.`
            ]);
        }

        if (narrative === 'collapse_threat') {
            pool = pool.concat([
                `This innings is wobbling now, and panic may start to creep in.`,
                `That wicket deepens the trouble considerably.`,
                `The fielding side can sense a collapse opening up here.`,
                `The batting order is being dragged into dangerous territory now.`,
                `Pressure has turned into damage for the batting side.`
            ]);
        }

        return this.pick(pool);
    }

    sixLine(result, batter, bowler, context) {
        const shotType = result.shotType || 'shot';
        const phase = this.getPhase(context);
        const batterState = this.inferBatterState(context);

        let pool = [
            `SIX! ${batter.name} launches it clean over the ropes!`,
            `MAXIMUM! ${batter.name} absolutely hammers the ${shotType}!`,
            `That has gone a long, long way from ${batter.name}!`,
            `Into the crowd! ${batter.name} gets all of that one!`,
            `What a strike. ${batter.name} sends it deep into the stands!`,
            `Six more! ${batter.name} clears the boundary with ease!`,
            `${batter.name} gets under it and it disappears for six!`,
            `That is a towering hit from ${batter.name}!`,
            `${batter.name} has turned that into a crowd souvenir!`,
            `Clean swing, clean contact, and six runs!`,
            `That is smoked by ${batter.name}, no chance for the fielders!`,
            `${batter.name} picks the length early and dispatches it!`,
            `The ball is gone, and the crowd loves it!`,
            `That is not just a six, that is a statement from ${batter.name}!`,
            `${batter.name} has nailed that and sent it into orbit!`,
            `He has picked the bones out of that one, six!`,
            `Explosive batting from ${batter.name}, all the way!`,
            `The swing is violent, the result is maximum!`,
            `That sound off the bat told the story immediately. Six!`,
            `${batter.name} punishes the mistake in brutal fashion!`
        ];

        if (batterState === 'dominant' || batterState === 'explosive') {
            pool = pool.concat([
                `${batter.name} is imposing himself on the contest now.`,
                `This is intimidation batting from ${batter.name}.`,
                `${batter.name} looks a step ahead of the bowler right now.`,
                `The bowler is being forced into survival mode here.`,
                `${batter.name} is not just scoring, he is commanding the game.`
            ]);
        }

        if (phase === 'death') {
            pool = pool.concat([
                `That is the kind of strike that can break a bowling plan in the death overs.`,
                `In the death phase, a hit like that lands twice as hard.`,
                `Exactly what the batting side wanted late in the innings.`,
                `That is a massive blow in the endgame.`,
                `You do not recover easily from errors like that in the death overs.`
            ]);
        }

        return this.pick(pool);
    }

    fourLine(result, batter, bowler, context) {
        const shotType = result.shotType || 'stroke';
        const phase = this.getPhase(context);

        let pool = [
            `FOUR! ${batter.name} finds the gap beautifully!`,
            `Boundary! ${batter.name} times the ${shotType} to perfection!`,
            `Races away to the rope, four more to ${batter.name}!`,
            `${batter.name} threads that past the field and collects four!`,
            `That is placed, not merely hit. Four runs!`,
            `Exquisite timing from ${batter.name}, and it reaches the boundary!`,
            `${batter.name} leans into the shot and gets a boundary for it!`,
            `That beats the infield and keeps racing away!`,
            `Picked the gap, beat the chase, four runs!`,
            `${batter.name} gets enough on it and the ball wins the race!`,
            `Precision over power there, and it is four!`,
            `The fielder gives chase, but the ball gets there first!`,
            `${batter.name} finds space where none seemed available!`,
            `That is a classy boundary from ${batter.name}!`,
            `The placement is superb and the reward is immediate!`,
            `${batter.name} opens the face and steers it away for four!`,
            `That was in the slot and ${batter.name} cashes in!`,
            `Wonderful touch from ${batter.name}, right into the gap!`,
            `No need to overhit when timing looks like that. Four!`,
            `${batter.name} beats the ring and wins the boundary!`
        ];

        if (phase === 'powerplay') {
            pool = pool.concat([
                `With fewer fielders out, timing like that becomes especially dangerous.`,
                `That is exactly how batters exploit the powerplay.`,
                `The field restrictions make that boundary even more costly.`,
                `This is why powerplay discipline matters so much.`,
                `That is smart batting in the fielding restriction phase.`
            ]);
        }

        if ((context.consecutiveBoundaries || 0) >= 2) {
            pool = pool.concat([
                `${bowler.name} is being picked apart here.`,
                `Pressure is rapidly shifting onto the bowling side now.`,
                `The batter has found a groove and ${bowler.name} is under fire.`,
                `This over is slipping away from ${bowler.name}.`,
                `The fielding side desperately needs a reset.`
            ]);
        }

        return this.pick(pool);
    }

    dotLine(result, batter, bowler, context) {
        const pressure = this.getPressureLevel(context);
        const batterState = this.inferBatterState(context);

        let pool = [
            `Dot ball. ${bowler.name} wins that exchange.`,
            `No run, and that is a useful ball for the fielding side.`,
            `${batter.name} cannot find a way through, dot delivery.`,
            `Tight bowling, nothing available there.`,
            `No scoring opportunity on that one.`,
            `${bowler.name} keeps things under control, dot ball.`,
            `That is well managed by ${bowler.name}.`,
            `A quiet ball, and the bowler will take it gladly.`,
            `${batter.name} is forced to respect that delivery.`,
            `Nothing off it, the pressure ticks up.`,
            `That is a small win for ${bowler.name}.`,
            `No release shot available there for ${batter.name}.`,
            `The field closes in and the run does not come.`,
            `Very little room to work with there.`,
            `${bowler.name} does the job with that delivery.`,
            `The batter is kept waiting, and still gets nothing.`,
            `Neatly controlled, no run.`,
            `That ball asks a question and gives no easy answer.`,
            `No damage on the scoreboard from that delivery.`,
            `The bowler keeps the squeeze in place.`
        ];

        if (pressure === 'high' || pressure === 'extreme') {
            pool = pool.concat([
                `And in this moment, every dot feels heavier than normal.`,
                `That does more on the mind than on the scoreboard.`,
                `The silence after a dot like that can be deafening.`,
                `Pressure like this turns dots into genuine weapons.`,
                `The fielding side will feel the psychological value of that one.`
            ]);
        }

        if (batterState === 'restless') {
            pool = pool.concat([
                `${batter.name} is starting to look a little impatient now.`,
                `You can sense the batter wanting to force something.`,
                `This is the kind of sequence that drags risky shots out of players.`,
                `${batter.name} is being denied rhythm here.`,
                `The frustration may be starting to build for ${batter.name}.`
            ]);
        }

        return this.pick(pool);
    }

    runLine(result, batter, bowler, context) {
        const runs = result.runs || 0;
        const phase = this.getPhase(context);

        let pool = [];

        if (runs === 1) {
            pool = [
                `Just a single. ${batter.name} nudges it into space.`,
                `One run taken, and the strike rotates.`,
                `${batter.name} works it away for a single.`,
                `A simple single, but useful for keeping things moving.`,
                `Tapped into the gap for one.`,
                `${batter.name} gets off safely with a single.`,
                `They settle for one and move on.`,
                `A controlled push for a single.`,
                `One more to the total, neatly done.`,
                `${batter.name} keeps the board ticking with a single.`,
                `Soft hands and a quick single.`,
                `Just enough space found for one run.`,
                `The batter opens the face and takes one.`,
                `There is the easy single on offer.`,
                `Quick feet, quick call, one run.`
            ];
        } else if (runs === 2) {
            pool = [
                `Two runs taken, and that is good running between the wickets.`,
                `${batter.name} comes back strongly for the second.`,
                `They turn one into two with sharp awareness.`,
                `Placed well enough for a comfortable couple.`,
                `Excellent hustle, and they get two.`,
                `${batter.name} pushes hard and is rewarded with a brace.`,
                `The gap is big enough, and they collect two.`,
                `Well judged running brings a pair of runs.`,
                `That is smart cricket, two taken quickly.`,
                `${batter.name} works hard for the second run.`,
                `A handy couple added to the total.`,
                `They run that one aggressively and get the full two.`,
                `Sharp calling in the middle, two runs.`,
                `That is busy batting from ${batter.name}.`,
                `The placement and the running combine for two.`
            ];
        } else if (runs === 3) {
            pool = [
                `Three runs, and that is excellent running all the way through.`,
                `${batter.name} keeps pushing and gets three for it.`,
                `Good placement, good urgency, three taken.`,
                `They come back for the third, and they make it comfortably.`,
                `That is terrific running between the wickets.`,
                `${batter.name} turns a good shot into three runs.`,
                `The outfield and angles allow them three here.`,
                `Energetic work in the middle, three added.`,
                `They never switch off and are rewarded with three.`,
                `That is value extracted from the gap, three runs.`
            ];
        } else {
            pool = [
                `${this.formatRuns(runs)} taken by ${batter.name}.`,
                `${batter.name} works it away for ${this.formatRuns(runs)}.`,
                `They collect ${this.formatRuns(runs)} from that ball.`,
                `${this.formatRuns(runs)} added to the total.`,
                `Smart batting from ${batter.name}, ${this.formatRuns(runs)} taken.`
            ];
        }

        if (runs >= 2) {
            pool = pool.concat([
                `That is excellent conversion between the wickets.`,
                `The awareness there was first-rate.`,
                `This is how batters squeeze value out of the field.`,
                `Nothing loose in the running there.`,
                `The decision-making between the wickets was spot on.`
            ]);
        }

        if (phase === 'middle' && this.maybe(0.3)) {
            pool = pool.concat([
                `These are the runs that quietly hold an innings together in the middle overs.`,
                `Not flashy, but deeply useful in this phase of the game.`,
                `Middle-over cricket is often built on exactly those runs.`,
                `That is smart tempo management from the batting side.`,
                `The middle overs reward this kind of busy batting.`
            ]);
        }

        return this.pick(pool);
    }

    // =========================================================
    // Narrative / Context Layers
    // =========================================================

    checkMilestones(context, batter) {
        const runs = context.currentBatterRuns || 0;

        if (runs >= 50 && runs < 56 && !this.milestones.has(`${batter.id}_50`)) {
            this.milestones.add(`${batter.id}_50`);
            return this.pick([
                `🎉 Fifty for ${batter.name}! A fine innings reaches an important landmark!`,
                `🎉 ${batter.name} brings up a half-century and earns the applause around the ground!`,
                `🎉 50 up for ${batter.name}, built with quality and control!`,
                `🎉 Half-century for ${batter.name}! This has been a knock of substance!`,
                `🎉 ${batter.name} reaches fifty and does it in style!`,
                `🎉 That is a deserved fifty for ${batter.name}!`,
                `🎉 The landmark arrives, ${batter.name} has a fifty to the name now!`,
                `🎉 A strong innings from ${batter.name} is now officially a half-century!`
            ]);
        }

        if (runs >= 100 && runs < 106 && !this.milestones.has(`${batter.id}_100`)) {
            this.milestones.add(`${batter.id}_100`);
            return this.pick([
                `💯 Century for ${batter.name}! A magnificent innings reaches three figures!`,
                `💯 ${batter.name} gets to a hundred, and the crowd rises in appreciation!`,
                `💯 A superb hundred from ${batter.name}! This has been a masterclass!`,
                `💯 ${batter.name} reaches three figures with a truly commanding knock!`,
                `💯 Brilliant from ${batter.name}, a century of quality and nerve!`,
                `💯 The hundred is complete, and it may prove match-defining!`,
                `💯 A landmark innings from ${batter.name}, that is a brilliant century!`,
                `💯 ${batter.name} has turned a strong innings into a memorable one!`
            ]);
        }

        return null;
    }

    pressureLine(context, batter, bowler, result) {
        if (!this.maybe(0.28)) return null;

        const pressure = this.getPressureLevel(context);

        if (context.innings === 2 && context.runsNeeded !== null && context.runsNeeded !== undefined) {
            if (context.runsNeeded <= 6) {
                return this.pick([
                    `Just ${context.runsNeeded} needed now. One clean strike can finish this.`,
                    `${context.runsNeeded} runs to win, and every heartbeat in the ground feels louder.`,
                    `Only ${context.runsNeeded} left. Nerve matters as much as technique now.`,
                    `${context.runsNeeded} required. The finish line is close enough to feel.`,
                    `This is now a tiny chase with massive pressure packed into it.`
                ]);
            }

            if ((context.requiredRunRate || 0) >= 14) {
                return this.pick([
                    `Required rate up at ${context.requiredRunRate}. This chase is becoming steep.`,
                    `${context.requiredRunRate} needed per over now, and the pressure is climbing.`,
                    `The asking rate is ${context.requiredRunRate}, and it is starting to stare the batters down.`,
                    `This chase is no longer comfortable, the rate has climbed to ${context.requiredRunRate}.`,
                    `That required rate tells its own story, this is getting demanding.`
                ]);
            }

            if ((context.requiredRunRate || 99) <= 7 && context.runsNeeded > 0) {
                return this.pick([
                    `The chase is under control for now, but control can vanish with one wicket.`,
                    `They still have breathing room, though cricket changes quickly.`,
                    `This remains manageable if the batting side stays calm.`,
                    `The numbers favor the chase at the moment, but only if they avoid panic.`,
                    `For now, the equation is workable and the batting side knows it.`
                ]);
            }
        }

        if ((context.consecutiveDots || 0) >= 4) {
            return this.pick([
                `${context.consecutiveDots} dots in a row. The squeeze is becoming serious.`,
                `A chain of dot balls, and the pressure keeps thickening.`,
                `${context.consecutiveDots} scoreless deliveries. The fielding side is tightening the screws.`,
                `The batting side is being starved of release here.`,
                `This sequence of dots is starting to shape decisions.`
            ]);
        }

        if ((context.consecutiveBoundaries || 0) >= 3) {
            return this.pick([
                `${context.consecutiveBoundaries} boundaries in a row. ${bowler.name} is under serious attack.`,
                `This has turned into a proper assault on the bowling.`,
                `The batter has found the range, and the bowler is taking damage.`,
                `That is relentless pressure on the fielding side now.`,
                `The over is running away from the bowling team.`
            ]);
        }

        if (pressure === 'extreme') {
            return this.pick([
                `This game is now being played as much in the mind as on the pitch.`,
                `The moment has reached genuine high-pressure territory.`,
                `This is where composure becomes the most valuable skill on the field.`,
                `Everything feels sharper when the pressure reaches this level.`,
                `These are the moments that define matches and reputations.`
            ]);
        }

        return null;
    }

    momentumLine(context, batter, bowler, result) {
        if (!this.maybe(0.24)) return null;
        if (result.wicket) return null;

        const narrative = this.inferMatchNarrative(context);
        const batterState = this.inferBatterState(context);

        if (narrative === 'onslaught') {
            return this.pick([
                `${bowler.name} is running out of comfortable options here.`,
                `${batter.name} has seized momentum and refuses to let go.`,
                `The balance of fear is shifting toward the bowler now.`,
                `${batter.name} is dictating the terms of this battle.`,
                `The fielding side badly needs a circuit-breaker.`
            ]);
        }

        if (narrative === 'squeeze') {
            return this.pick([
                `${batter.name} is being denied rhythm ball after ball.`,
                `This is classic pressure building from the bowling side.`,
                `${bowler.name} is making every scoring shot feel earned.`,
                `The fielding side is controlling the emotional pace of the over.`,
                `This is the kind of spell that can drag a mistake out of a batter.`
            ]);
        }

        if (narrative === 'finish_line') {
            return this.pick([
                `The target is near, but closeness can intensify nerves.`,
                `When the finish line is this close, every decision feels magnified.`,
                `These are the moments where calm hands matter most.`,
                `The batting side can almost taste victory, which is exactly why tension rises.`,
                `The end is near, but endings are rarely simple in cricket.`
            ]);
        }

        if (batterState === 'dominant') {
            return this.pick([
                `${batter.name} looks deeply set now and full of certainty.`,
                `There is authority in the way ${batter.name} is batting right now.`,
                `${batter.name} appears to be reading the game early and clearly.`,
                `This is the presence of a batter who feels in command.`,
                `${batter.name} is operating from a place of confidence now.`
            ]);
        }

        if (batterState === 'restless') {
            return this.pick([
                `${batter.name} looks like a player searching for release.`,
                `There is a hint of impatience in ${batter.name}'s body language.`,
                `${batter.name} may be getting tempted into forcing the next ball.`,
                `The bowler will sense that restlessness.`,
                `This is a delicate patch for ${batter.name}.`
            ]);
        }

        return null;
    }

    phaseLine(context, result, batter, bowler) {
        if (!this.maybe(0.16)) return null;

        const phase = this.getPhase(context);

        if (phase === 'powerplay') {
            return this.pick([
                `The powerplay keeps boundaries expensive and mistakes visible.`,
                `Field restrictions make every gap more dangerous in this phase.`,
                `This is the part of the innings where timing can hurt quickly.`,
                `The powerplay rewards boldness, but only if the execution is clean.`,
                `There are scoring opportunities everywhere in this fielding setup.`
            ]);
        }

        if (phase === 'middle') {
            return this.pick([
                `The middle overs are a test of tempo, patience, and rotation.`,
                `This is where matches are often shaped quietly rather than loudly.`,
                `Middle-over cricket is about control as much as aggression.`,
                `This phase rewards teams that think clearly between moments.`,
                `You often win the final overs by how you manage the middle ones.`
            ]);
        }

        if (phase === 'death') {
            return this.pick([
                `We are in the death overs now, where execution lives on a knife-edge.`,
                `This is the brutal endgame of the innings.`,
                `Every ball in the death phase carries oversized consequences.`,
                `The death overs punish mistakes faster than any other phase.`,
                `Nerve, accuracy, and decision-making are everything right now.`
            ]);
        }

        return null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommentarySystem };
}