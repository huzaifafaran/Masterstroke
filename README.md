# Cricket Legends - Advanced Mechanics & Engine Documentation

This document serves as the exhaustive technical reference for the underlying systems, mathematics, attributes, physics, and AI tactical dictionaries driving **Cricket Legends**. The simulation operates far beyond basic arcade logic, heavily utilizing physics-based probability tables, dynamically resizing timing matrices, granular player attributes, and an extensive dictionary of shots and deliveries.

---

## 1. Local Setup & LLM Tactical Brain

The game supports an optional neuro-symbolic LLM tactical planner orchestrating AI batting and bowling plans based on live match context. The API key is read from `.env` by a local proxy.

### Setup
1. Copy `.env.example` to `.env` and fill `OPENAI_API_KEY`.
2. Start proxy: `node server/tacticalProxy.js`
3. In `index.html`, set: `window.GAME_LLM_CONFIG.enabled = true`
4. Run the game via your local server.

---

## 2. Game Modes & Toss Logic

The Match Engine (`engine.js`) orchestrates two primary flow-states via distinct controllers:
*   **Duel Mode (`DuelModeController.js`):** Local 1v1 where players swap controls manually. 
*   **VS AI Mode (`VsAIModeController.js`):** Human vs AI flow. The Toss is simulated deterministically: `Math.random() > 0.5`. If the human wins, they choose to Bat or Bowl. If the AI wins, it uses the LLM Context engine to evaluate pitch and team composition to select its role. Roles are seamlessly inverted at the `Innings 2` swap trigger event.

---

## 3. Core Engine: World State & Environments

### 3.1 The Pressure Matrix
Match pressure (`0.0 - 1.0` scale) dynamically shifts fielding configurations, batters' composure logic, and AI aggression logic. It is recalculated instantly on match events:
*   **Wickets:** `+0.08` per wicket fallen.
*   **Run Rate Chasing:** If chasing and Required Run Rate (RRR) > 10 (`+0.3`), RRR > 8 (`+0.2`), RRR > 6 (`+0.1`).
*   **Death Throes:** Runs needed <= 20 and Balls Left <= 12 yields `+0.25` pressure.
*   **Dot Balls:** 4+ consecutive dot balls add `0.1 * (dots - 3)`.
*   **Death Overs:** If the game enters the last 4 overs, base pressure inherently rises by `0.1`.

### 3.2 Field Density Shifting
Field configurations map 5 zones (`straight`, `offside`, `legside`, `deep`, `innerRing`).
*   **Powerplay Phase:** Deep fielder density is reduced by `0.08` (capped at 0.22 min).
*   **Death Phase:** Deep fielder density is boosted by `0.12` (up to 0.90 max), pulling out the inner ring by `0.06`.
*   **Pressure Impact:** The inner ring tightens directly proportional to the `Pressure Matrix`: `InnerRing += Pressure * 0.08`.

### 3.3 Pitch Deterioration & Environments
Pitches alter fundamental physics calculations over an innings.
*   **Batting Friendly:** Pace (0.8x base), Spin (0.7x base), Timing Bar (1.1x sizing), Edge Assist (0.92x).
*   **Pace Friendly:** Pace (1.2x base), Spin (0.9x base), Timing (0.9x shrink), Bounce Variance (+0.15).
*   **Spin Friendly:** Spin (1.4x base Turn), Pace (0.9x base), Timing (0.95x).
*   **Worn Pitch:** Pace (0.85x), Spin (1.6x Turn base), Timing (0.85x squeeze), Edge multiplier (1.18x), Bounce Variance (0.25 max deviation).

---

## 4. Bowling Physics & Delivery Modeling (`bowling.js`)

### 4.1 The Execution Control Check
The human/AI presses to stop an oscillating meter.
*   **Execution Quality (`execQuality`):** `1 - Math.abs(meterPosition - 50) / 50` (returns `0.0` to `1.0`).
*   **Aim Scatter:** Bowling accuracy generates an error cone `ConeRadius = 30 * (1 - BowlerAccuracy / 125)`.
*   **Control Pass:** The game rolls a 1-100 check against `BowlerControl`. If breached, or if `execQuality < 0.5`, the landing coordinate drifts dynamically up to `ConeRadius * (1 - execQuality)`. 

### 4.2 Speed, Bounce, and Swing Synthesizing
*   **Fatigue Degradation:** Speed scalar reduces by `(1 - Stamina / 100) * 0.2` over spells.
*   **Base Speed Formulation:** Pace (`120 + Stat * 40kph`), Spin (`70 + Stat * 20kph`).
*   **Slower Variations:** Cutters, slower bouncers, and flighted balls apply heavy scalar reductions (`0.75` - `0.85x`).
*   **Swing Amplifiers:** Base lateral movement is `(SwingStat / 100) * 1.2`. Intentional outswing/inswing applies a `1.3x` bump, whereas sliders or cutters gain a `1.15x` cut.

### 4.3 The Deception/Disguise Logic
A critical component. Slow balls/Doosras multiply their disguise strength directly by the user's `execQuality` at release. 
*   **Read Check Formula:** The batter attempts to pierce the disguise by rolling: `(Composure * 0.4) + (Timing * 0.3) + (Awareness * 0.3)` against the incoming `BowlerDisguise`. Failure masks the delivery trajectory in the UI.

---

## 5. Batting Mechanics & Contact Matrices (`batting.js`)

The timing UI is a completely mathematically governed slider representing physical mechanics.

### 5.1 The Timing Layer (Window & Bar Speed)
Timing bands (Perfect, Good, Early, Late) stretch or compress dynamically every single delivery.
*   **Timing Window Width:** The "Perfect" timing window is linearly scaled based on the batter's `Timing` attribute:
    ```javascript
    PerfectZone = (40 + (batter.timing * 0.6)) * scale;
    ```
    *(Scales: Easy: 1.3x, Medium: 1.0x, Hard: 0.7x. Result: A 100-timing player gets a 100ms window; a 0-timing player gets ~40ms).*
*   **Timing Bar Speed:** The cursor speed is a summative evaluation of environmental and ball difficulty:
    ```javascript
    speed = 2.0 + (pace/100)*2.2 + (variation/100)*1.0 + difficulty*1.2 + 
            pressure*0.75 + movement*0.45 + risk*0.9 + (1.05 - matchupScore)*0.7;
    // Skill Reduction: Slows the bar down for better players
    speed *= (1 - ((timing * 0.65 + footwork * 0.35) * 0.22));
    ```
*   **Zone Squeezing:** If `Delivery Threat > Batter Skill`, the "Perfect" and "Good" bands physically drop by factors of up to `-5.2%` total width. High match pressure brutally tightens the perfect window `PerfectWidth -= Pressure * 4.1`.

### 5.2 Sweet Spot & Contact Probability
When the cursor stops on a timing grade, the engine uses Bayesian-style probability shifting to determine if you hit the Sweet Spot or catch an Edge:
*   **Contact Probability Rolls:** Base probabilities roll against Timing Grade (e.g., Perfect/Good):
    ```javascript
    probs.sweet += (skill - 0.56) * 0.30 + (matchupScore - 1) * 0.26 - risk * 0.14;
    probs.edge  += (1 - matchupScore) * 0.26 + risk * 0.18 + threat * 0.17;
    ```
*   Hitting exactly "Perfect" mathematically disables purely fatal misfields unless the user attempted an incredibly foolish shot against a counter-delivery.

### 5.3 Engine Trajectory Physics
Upon resolving contact, the engine calculates true flight dynamics via ballistic physics mapping.
*   **Exit Velocity Calculation:**
    ```javascript
    baseVelocity = 14 + (powerAttr/100)*12 + (shot.powerMult)*8;
    exitVelocity = baseVelocity * contact.powerFactor * (0.85 + matchupScore * 0.20) * pitchCarry;
    ```
*   **Ballistic Carry & Distance Roll:** 
    ```javascript
    // 11.8: tuned gravity/drag constant ensuring distances feel "Cricket-legal" (60-100m)
    ballisticCarry = (exitVelocity^2 * Math.sin(2 * elevationRad)) / 11.8;
    groundRoll = (exitVelocity * Math.cos(elevationRad) - 7) * groundRollMod * outfieldSpeed;
    ```

---

## 6. Fielding, Running, & Dismissal Physics

The ball's `Exit Velocity` and `Trajectory Elevation` are mapped against the `Field Density` array.

### 6.1 Running & Boundary Logic
*   **Space & Cover:** If the ball stays grounded (`elevation < 22`) and its distance hits the dynamic `boundaryLine` variable, it's 4. If it clears the line and is aerial, it rolls a `getSixProbability()` check.
*   **Running Between Wickets:** `RunPotential` scales via `Distance / 24` + Gap Manipulation stats + Running Speed modifiers.
    * `Runs = 1` for < 1.35. `Runs = 2` if < 2.35. `Runs = 3` above that. 
    * `Misfield Chance` (0.01 to 0.22 max) adds `+1` run and is heightened during the Death phase.

### 6.2 Dismissal Calculations (`resolveDismissal()`)
*   **Bowled / LBW:** Occurs overwhelmingly on "Miss" or "Very Late/Early". Yorker boosts Bowled chance by +20%. Inswing boosts LBW chance by +18%.
*   **Edge Catching:** Slip catch chances scale off `outside_off` delivery lines and the `offside` field density preset. Keeper catches scale heavily via `innerRing` field density and low elevations.
*   **Aerial Catching:** If `elevation >= 16` and `distance > 18`, a Catch Roll occurs using field density mapping.
    ```javascript
    catchChance = 0.05 + density * (deep ? 0.22 : 0.18) + contactPenalty + riskPenalty - timingBonus;
    ```
    Shots hit "Deep" (`distance > 42`) use the `deep` field density variable (up to 0.90 density in Death Overs), heavily punishing mistimed power shots with near 60% catch rates. Conversely, a `timingBonus` for striking it *Perfect* reduces catch chance by up to 35%, simulating the batter "finding the gap."

---

## 7. Delivery Dictionary

### 7.1 Pace Deliveries
*   **Yorker (Length: Full, Risk: 0.30, Diff: 0.80):** High difficulty, high risk. 
*   **Bouncer (Length: Short, Risk: 0.25, Diff: 0.50):** Standard aggressive short ball. 
*   **Good Length (Risk: 0.10, Diff: 0.30):** The stock ball. 
*   **Full Length (Risk: 0.15, Diff: 0.40):** Pitching it up inviting the drive. 
*   **Slower Ball (Risk: 0.20, Diff: 0.60):** Drops raw pace (0.75x speed). Disguise heavily relies on perfect execution.
*   **Knuckle Ball (Risk: 0.24, Diff: 0.72):** Advanced pace off variation. (0.78x speed). 
*   **Off Cutter (Risk: 0.20, Diff: 0.62):** Gripping variation. (0.86x speed, 1.15x turn bounce).
*   **Slower Bouncer (Risk: 0.28, Diff: 0.66):** Deceptive short ball. 
*   **In-Swing (Risk: 0.15, Diff: 0.50):** Tails into the batter. 1.3x swing scalar.
*   **Out-Swing (Risk: 0.15, Diff: 0.50):** Shapes away from the batter. 1.3x swing scalar.

### 7.2 Spin Deliveries
*   **Stock Ball (Risk: 0.10, Diff: 0.30):** Standard spinning delivery.
*   **Doosra (Risk: 0.25, Diff: 0.70):** Off-spin turning the other way. High disguise requirement. 
*   **Googly (Risk: 0.25, Diff: 0.70):** Leg-spin turning the other way.
*   **Flighted (Risk: 0.20, Diff: 0.50):** Dropped into the pitch with loops. 0.85x speed.
*   **Arm Ball (Risk: 0.15, Diff: 0.50):** Drifts in, doesn't spin. 
*   **Top Spinner (Risk: 0.15, Diff: 0.50):** Dips violently with overspin.
*   **Carrom Ball (Risk: 0.24, Diff: 0.74):** Flicked mysteriously. 1.2x turn scalar.
*   **Flipper (Risk: 0.24, Diff: 0.72):** Skids low and fast. 0.15 bounce base (very low). 
*   **Slider (Risk: 0.22, Diff: 0.66):** Pushed through quick. 1.15x turn scalar.

---

## 8. Shot Dictionary & Matchup Engine

Batsmen can access a massive library of 28 distinct shots.

### 8.1 Shot Categories
*   **Orthodox:** Defend (Risk 0.05, Power 0.2x), Drive (Risk 0.15, Power 0.7x), Cut (Risk 0.20, Power 0.65x), Pull (Risk 0.30, Power 0.85x), Sweep (Risk 0.25, Power 0.6x).
*   **Advanced Drives:** Straight Drive (0.13), On Drive (0.18), Flick (0.18), Inside Out (0.33), Lofted Cover (0.40), Late Cut (0.26).
*   **Aggressive Power:** Lofted (Risk 0.45, Power 1.0x), Slog (Risk 0.48, Power 1.0x), Slog Sweep (0.44), Helicopter (0.50, Power 1.05x).
*   **Innovative / 360:** Scoop (Risk 0.55), Switch Hit (Risk 0.50), Reverse Sweep (0.40), Upper Cut (0.42), Reverse Lap (0.50), Dab (0.24).

### 8.2 The Shot Matchup Matrix (`SHOT_MATCHUP_PROFILES`)
Whenever a shot is played, the game cross-references it against the Delivery. The resulting score modifies the Timing Bar width, edge chances, and directly feeds into the contact formulas!
*   **Matchup Calculation:**
    ```javascript
    score = 1.0 * lengthMod * lineMod * paceSpinMod * deliveryTypeMod;
    score *= (1 - (movementSensitivity * ballMovement * 0.18));
    ```
* **Pulling a Yorker:** Yields a length mismatch penalty of `0.22x` (devastating to your timing metrics). Pulling a Bouncer is `1.45x`.
* **Sweeping Pace vs Spin:** Sweeping yields `0.62x` vs Pace, but `1.22x` vs Spin.
* **Scooping or Lapping:** Scooping a full delivery has a synergistic multiplier of `1.18x`, whereas scooping a bouncer crushes the score `0.35x`.
* **Cutting Line:** Cutting a ball on the stumps is `0.92x`, outside leg `0.65x`, but outside off provides `1.20x` synergy.

---

## 9. Player Attributes & Dynamic Signature Modifiers (`players.js`)

Players utilize a layered mathematical structure: Base Attributes -> Identity Matrix -> Conversion Profiles -> Signature Conditionals.

### 9.1 Identity & Conversion Vectors
Hidden 0-100 attributes dictate behavioral biases:
*   `orthodoxControl`: Flat buff to drives and sweeps.
*   `yorkerPunishBias`: Determines if the batter turns difficult block-hole deliveries into boundaries.
*   `loftedSixBias`: Percentage roll multiplier modifying whether a perfect lofty shot actually clears the boundary rather than bouncing right before it.

### 9.2 Elite Signature Abilities
The engine checks `signature.condition(matchState)` every ball to apply localized mathematical overrides. Examples:
*   **Virat Kohli:** Chase Master. 1.2x timing/composure in Innings 2.
*   **AB de Villiers:** 360 Mastery. Permanent Innovative shot buff.
*   **Chris Gayle:** Universe Boss. Power spikes after boundaries.
*   **Shane Warne:** Leg Spin Sorcery. Enhanced turn and drift.
*   **Wasim Akram:** Sultan of Swing. Early reverse swing mathematics.

---

## 10. The Elite Director Engine (V3.3 Commentary)

The V3.3 update replaces static outcome strings with a holistically constructed narrative system that treats physics as the core reason for every line.

### 10.1 Structured Generation Flow
Every ball generates a "Primary Call" and an "Analyst Insight" (Secondary Call):
1.  **Event Modeling:** Synthesis of `contactType`, `timingDetail`, `shotType`, and `geography`.
2.  **Phrase Chaining:** Clauses are pulled from archetypal phrase banks (e.g., power hitters "hammer" while timers "caress").
3.  **Elite Scoring:** A candidate selection algorithm scores thousands of permutations based on detail richness, sentence structure, and semantic freshness to ensure zero repetition.

### 10.2 Global Physics Integration
- **Miscue Logic:** If `contactType` is `weak`, the commentary natively embeds the reason (e.g., *"Miscued it off the toe-end"*).
- **Dismissal Physics:** Bowled outcomes now branch specifically based on whether the batter was beaten for pace (*"Beaten for sheer pace!"*) or chopped it on (*"Chopped on! Inside edge onto the stumps"*).

---

## 11. Custom Squad & Team Selection Logic

The game now features a fully player-selected 11-man squad system.

### 11.1 Roster Categorization
- **Categories:** Batsmen, Bowlers, All-rounders, Wicket keepers.
- **Sub-filters:** Openers, Middle Order, Pacers, Spinners.
- **Constraints:** Enforces exactly 11 players, at least 1 Wicketkeeper, and a minimum of 5 Bowlers before the match can begin.

### 11.2 Sequence Batting Order
The batting order is no longer static. The `app.js` logic tracks the exact sequence of clicks in the selection modal; the player selected 1st becomes the 1st opener, and so on.

---

## 12. The LLM Tactical Brain (`TacticalBrainClient.js`)


An advanced neuro-symbolic engine parses live simulation telemetry.

### 10.1 Rolling Match Memory & Effectiveness Grading
Every over end, the AI calculates `PlanEffectiveness`. If the previous over's plan successfully generated dots/wickets, its score climbs. If the AI was hit for 15+ runs, the tactical brain automatically degrades the previous plan's cache rating and demands a refresh from the prompt architecture.

### 10.2 Prompt Synthesis Matrix
The actual query injected to the target LLM dynamically includes:
*   `Composure/Timing/Control` imbalances dynamically extracted from engine stats.
*   Available *legal* shot dictionaries mapping exactly to `PLAYER_ALLOWED_SHOTS` and `PLAYER_ALLOWED_DELIVERIES` for that individual player (e.g., Malinga is restricted from randomly bowling a Doosra in LLM generation logic).

### 10.3 Simulating AI Execution Errors
The AI doesn't perfectly achieve LLM strategies. Inside `AIController.js -> simulateExecution()`, the AI rolls an `ExecutionQuality` RNG identical to the human meter. 
`Position = target + randomlyDistributedError * BowlerControlSkill`. 
The LLM can ask for a Yorker (`length: 95`), but if the Bowler's AI control RNG fails, it drops to a juicy Full Toss, keeping the gameplay remarkably organic and balanced rather than mechanically perfect.
