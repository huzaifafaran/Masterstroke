const fs = require('fs');

const path = 'js/commentary.js';
let content = fs.readFileSync(path, 'utf-8');

// 1. Update the generate() dispatch branch
const generateOriginal = `        if (ballResult.wicket) {
            lines.push(this.wicketLine(ballResult, batter, bowler, matchContext));
        } else if (ballResult.six) {
            lines.push(this.sixLine(ballResult, batter, bowler, matchContext));
        } else if (ballResult.boundary) {
            lines.push(this.fourLine(ballResult, batter, bowler, matchContext));
        } else if ((ballResult.runs || 0) === 0) {
            lines.push(this.dotLine(ballResult, batter, bowler, matchContext));
        } else {
            lines.push(this.runLine(ballResult, batter, bowler, matchContext));
        }`;

const generateNew = `        if (ballResult.wicket) {
            lines.push(this.wicketLine(ballResult, batter, bowler, matchContext));
        } else if (ballResult.contactType === 'miss') {
            lines.push(this.missLine(ballResult, batter, bowler, matchContext));
        } else if (ballResult.contactType === 'edge' && !ballResult.boundary && !ballResult.six && !ballResult.wicket && ballResult.runs === 0) {
            lines.push(this.edgeLine(ballResult, batter, bowler, matchContext));
        } else if (ballResult.six) {
            lines.push(this.sixLine(ballResult, batter, bowler, matchContext));
        } else if (ballResult.boundary) {
            lines.push(this.fourLine(ballResult, batter, bowler, matchContext));
        } else if ((ballResult.runs || 0) === 0) {
            lines.push(this.dotLine(ballResult, batter, bowler, matchContext));
        } else {
            lines.push(this.runLine(ballResult, batter, bowler, matchContext));
        }`;

content = content.replace(generateOriginal, generateNew);

// 2. Add the call to physicsLine
const physicsCallOriginal = `        const timingLabel = this.timingQualityLine(ballResult);
        if (timingLabel) lines.push(timingLabel);

        const milestoneLine = this.checkMilestones(matchContext, batter);`;

const physicsCallNew = `        const timingLabel = this.timingQualityLine(ballResult);
        if (timingLabel) lines.push(timingLabel);

        const physicsLine = this.physicsLine(ballResult, matchContext, batter, bowler);
        if (physicsLine) lines.push(physicsLine);

        const milestoneLine = this.checkMilestones(matchContext, batter);`;

content = content.replace(physicsCallOriginal, physicsCallNew);

const wicketLineOriginal = "    wicketLine(result, batter, bowler, context) {";

const newMethods = "    missLine(result, batter, bowler, context) {\n" +
"        const shot = result.shotType ? result.shotType.replace('_', ' ') : 'shot';\n" +
"        const type = result.deliveryType || 'ball';\n" +
"        let pool = [\n" +
"            `Beaten! ${batter.name} plays and misses completely.`,\n" +
"            `Total fresh air. ${batter.name} went for the ${shot} and missed.`,\n" +
"            `A swing and a miss from ${batter.name}.`,\n" +
"            `${bowler.name} beats the bat beautifully.`,\n" +
"            `The batter had no answer for that delivery.`,\n" +
"            `Whizzed past the edge! Played for the ${shot} but didn't connect.`,\n" +
"            `That's a moral victory for ${bowler.name}, absolutely castled the outside edge without taking it.`,\n" +
"            `Tried to force the pace with a ${shot} but struck nothing but air.`,\n" +
"            `A wild swish from ${batter.name}, and a quiet smile from ${bowler.name}.`,\n" +
"            `Nowhere near it! ${batter.name} has been totally deceived there.`,\n" +
"            `Comprehensively beaten! The ${type} does the trick.`,\n" +
"            `Poked at it and missed. That was a half-hearted attempt.`,\n" +
"            `Throwing the bat at it, and finding absolutely nothing.`,\n" +
"            `A clean beat! ${bowler.name} is looking dangerous.`\n" +
"        ];\n" +
"\n" +
"        if (result.timingDetail === 'very_early' || result.timingDetail === 'early') {\n" +
"            pool.push(`Through the shot far too early. Beaten by the lack of pace or late movement.`);\n" +
"            pool.push(`The bat came down too soon. Completely deceived by the flight or pace.`);\n" +
"            pool.push(`Way too early on the stroke. Allowed the ball to win the waiting game.`);\n" +
"            pool.push(`Pre-meditated and poorly executed, miles early on that one.`);\n" +
"            pool.push(`Finished the shot before the ball had even arrived!`);\n" +
"        } else if (result.timingDetail === 'very_late' || result.timingDetail === 'late') {\n" +
"            pool.push(`Late on the stroke. The ball was past him before the bat came down.`);\n" +
"            pool.push(`Hurried by ${bowler.name}. Couldn't get the bat down in time for the ${shot}.`);\n" +
"            pool.push(`Pace beats him there. Hands were just too slow to react.`);\n" +
"            pool.push(`Too fast for ${batter.name}. The bat was nowhere near the ball in time.`);\n" +
"            pool.push(`A fraction late, and against a bowler like ${bowler.name}, that's enough to get beaten.`);\n" +
"        }\n" +
"        \n" +
"        // Pitch variation\n" +
"        if (context.pitch && context.pitch.id === 'spin' && type.includes('spinner')) {\n" +
"             pool.push(`Beaten by the sharp turn! That ripped off the surface.`);\n" +
"             pool.push(`Look at that spin! Absolutely unplayable from ${bowler.name}.`);\n" +
"        } else if (context.pitch && context.pitch.id === 'pace' && type.includes('bouncer')) {\n" +
"             pool.push(`Beaten by sheer pace and bounce! The pitch is really helping ${bowler.name}.`);\n" +
"        }\n" +
"        \n" +
"        return this.pick(pool);\n" +
"    }\n" +
"\n" +
"    edgeLine(result, batter, bowler, context) {\n" +
"        let pool = [\n" +
"            `Edged... but safe! That didn't go to hand.`,\n" +
"            `Off the edge! The batter survives a nervy moment.`,\n" +
"            `Thick edge from ${batter.name}, didn't carry to the fielders.`,\n" +
"            `Inside edge, saved by the pads or the pitch.`,\n" +
"            `A streaky shot, off the edge but no damage done for now.`,\n" +
"            `${bowler.name} finds the edge but lacks the luck to get the wicket!`,\n" +
"            `Chopped into the ground. That could have easily gone back onto the stumps.`,\n" +
"            `Soft edge, stopped cleanly in the infield.`,\n" +
"            `He's found the edge, but it dies before reaching the slip cordon!`,\n" +
"            `A lucky escape! Flashed hard and got away with a thick edge.`,\n" +
"            `Just nicked it! The bowler has his hands on his head.`,\n" +
"            `Dropping short of the keeper! That was a massive let off.`,\n" +
"            `Played with hard hands and got the edge, but it falls short.`,\n" +
"            `An agonizing edge for ${bowler.name}, so close to a dismissal.`\n" +
"        ];\n" +
"        return this.pick(pool);\n" +
"    }\n" +
"\n" +
"    physicsLine(result, context, batter, bowler) {\n" +
"        if (!this.maybe(0.50)) return null;\n" +
"\n" +
"        const distance = result.distance || 0;\n" +
"        const elevation = result.elevation || 0;\n" +
"        const pitch = context.pitch?.id || 'normal';\n" +
"        let pool = [];\n" +
"\n" +
"        if (result.six || result.boundary) {\n" +
"             if (elevation > 35) pool.push(`Skied incredibly high! The hang time on that was massive.`);\n" +
"             if (elevation > 45) pool.push(`It's gone a mile straight up in the air... and clears the ropes!`);\n" +
"             if (elevation < 12 && result.boundary) pool.push(`Raced along the turf. It was essentially a bullet along the ground.`);\n" +
"             if (elevation < 8 && result.boundary) pool.push(`Pierced the gap with surgical precision along the carpet.`);\n" +
"             \n" +
"             if (distance > 95 && result.six) pool.push(`Massive hit! That traveled ${Math.round(distance)} meters!`);\n" +
"             if (distance > 105 && result.six) pool.push(`A colossal strike! We are looking at ${Math.round(distance)} meters there. Monstruous!`);\n" +
"             if (distance > 115 && result.six) pool.push(`That is out of the stadium! ${Math.round(distance)}m, one of the biggest hits you will ever see.`);\n" +
"             \n" +
"             if (result.contactType === 'sweet') {\n" +
"                 pool.push(`Right out of the meat of the bat. That sounded beautiful.`);\n" +
"                 pool.push(`The crack off the bat told the whole story. Absolute perfection.`);\n" +
"                 pool.push(`He hit that so cleanly, the purest connection possible.`);\n" +
"             }\n" +
"             if (result.contactType === 'clean') {\n" +
"                 pool.push(`Clean strike. Picked the length perfectly.`);\n" +
"                 pool.push(`Excellent connection, right in the driving zone.`);\n" +
"             }\n" +
"             if (result.contactType === 'edge' && result.boundary) {\n" +
"                 pool.push(`Edged, and it flies past the slips for four! Unlucky for the bowler.`);\n" +
"                 pool.push(`A thick outside edge races down to the third man boundary.`);\n" +
"                 pool.push(`Streaky runs! But they all count in the scorebook.`);\n" +
"             }\n" +
"             if (result.contactType === 'weak') {\n" +
"                 pool.push(`Sliced away for four. Not in total control, but effective.`);\n" +
"                 pool.push(`Off the toe of the bat, but it finds the gap and trickles into the rope.`);\n" +
"                 pool.push(`Didn't catch that clean at all, but such is the power it clears the infield anyway!`);\n" +
"             }\n" +
"        } \n" +
"        \n" +
"        if (result.runs === 0 && !result.wicket) {\n" +
"            if (result.contactType === 'weak') {\n" +
"                 pool.push(`Mistimed completely. They tried to execute it but couldn't get hold of it at all.`);\n" +
"                 pool.push(`Very weak contact. The bat twisted in the hands.`);\n" +
"                 pool.push(`It came off the sticker. No power in that shot whatsoever.`);\n" +
"            }\n" +
"            if (result.contactType === 'edge') {\n" +
"                 pool.push(`A nervous dab that takes the edge. Survives for now.`);\n" +
"            }\n" +
"        }\n" +
"\n" +
"        // Context / Matchup logic\n" +
"        if (batter && bowler) {\n" +
"            if (bowler.bowlingStyle === 'pace_fast' && batter.country !== bowler.country && type === 'bouncer' && elevation > 20) {\n" +
"                 pool.push(`Hostile fast bowling meets aggressive intent. That ball was absolutely flying.`);\n" +
"            }\n" +
"            if (batter.isOpener && context.currentOver < 6 && result.boundary) {\n" +
"                 pool.push(`The opener taking full advantage of the powerplay restrictions!`);\n" +
"            }\n" +
"        }\n" +
"\n" +
"        // Pitch contexts\n" +
"        if (pitch === 'pace' && elevation > 20) pool.push(`The hard track offers extra bounce, and the ball flew up off the bat.`);\n" +
"        if (pitch === 'worn' && result.contactType === 'weak') pool.push(`The worn pitch causes some stickiness in the surface there, making strokeplay difficult.`);\n" +
"        if (pitch === 'spin' && result.contactType === 'miss') pool.push(`Dust flying off the pitch! The spin is talking volumes here.`);\n" +
"\n" +
"        if (pool.length === 0) return null;\n" +
"        return this.pick(pool);\n" +
"    }\n" +
"\n" +
"    wicketLine(result, batter, bowler, context) {";

content = content.replace(wicketLineOriginal, newMethods);

fs.writeFileSync(path, content, 'utf-8');
console.log('Commentary injections complete.');
