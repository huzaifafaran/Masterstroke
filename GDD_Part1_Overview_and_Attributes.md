# CRICKET LEGENDS — Game Design Document

**Version:** 1.0  
**Genre:** Sports Simulation / Arcade  
**Platform:** PC, Console  
**Engine:** Unreal Engine 5  

---

# 1. Game Overview

**Cricket Legends** is a skill-based cricket video game featuring a curated roster of 16 iconic cricket players. The smaller roster enables deep mechanical differentiation — every player *feels* different to play. The game prioritizes player skill, timing, and strategic decision-making over randomized outcomes.

**Core Pillars:**
- **Skill Expression** — Batting and bowling outcomes are determined by player input quality
- **Strategic Depth** — Field placement, bowler rotation, shot selection, and matchup exploitation
- **Player Identity** — Every cricketer has unique signature abilities that alter gameplay systems
- **Dynamic Conditions** — Pitch, weather, and match situation create evolving tactical puzzles

**Target Audience:** Cricket fans who want mechanical depth; fighting-game and sports-sim players who enjoy mastering systems.

---

# 2. Core Gameplay Philosophy

| Principle | Implementation |
|---|---|
| Skill > RNG | Timing windows, aim precision, and decision-making determine outcomes. Dice rolls are minimized. |
| Risk vs Reward | Aggressive shots have higher payoff but tighter timing windows and larger miss penalties. |
| Readable Complexity | Systems are layered — easy to pick up, deep to master. Visual cues telegraph every delivery. |
| Matchup Strategy | Player abilities create asymmetric encounters. A spinner vs a sweep specialist plays differently than vs a front-foot driver. |
| Momentum | Match pressure, player confidence, and fatigue create emergent narrative arcs. |

---

# 3. Player Attribute System

All attributes use a **0–100 scale**. Attributes feed into gameplay formulas that modify timing windows, physics forces, accuracy cones, and probability thresholds.

## 3.1 Batting Attributes

| Attribute | Gameplay Effect |
|---|---|
| **Timing** | Width of the "Perfect" timing window in ms. `PerfectWindow = 40 + (Timing × 0.6)` ms. A 90-Timing batter gets a 94ms perfect window vs 58ms for a 30-Timing batter. |
| **Shot Placement** | Accuracy of directional input. Higher values reduce the angular deviation between intended and actual shot direction. `DeviationAngle = 15° × (1 - ShotPlacement/100)`. |
| **Power** | Exit velocity multiplier on contact. `ExitVelocity = BaseVelocity × (0.6 + Power/250)`. A Power-100 player hits 40% harder than baseline. |
| **Footwork** | Speed and range of the batter's movement to the pitch of the ball. Determines ability to reach wide/short deliveries. `ReachRadius = 0.5m + (Footwork/100 × 1.0m)`. |
| **Composure** | Resistance to pressure penalties. When match pressure is high, all timing windows shrink by `PressurePenalty × (1 - Composure/100)`. High composure negates up to 100% of pressure effects. |

## 3.2 Bowling Attributes

| Attribute | Gameplay Effect |
|---|---|
| **Pace / Spin** | Delivery speed (pace bowlers: 120–160 kph mapped from 0–100) or spin revolutions (spin bowlers: RPM mapped 800–2400). Faster pace = less batter reaction time. Higher spin = more turn off pitch. |
| **Accuracy** | Size of the aiming reticle cone. `AimConeRadius = 30cm × (1 - Accuracy/125)`. At 100 Accuracy, the cone is 6cm — pinpoint. |
| **Swing / Turn** | Magnitude of lateral ball movement. `SwingDeviation = MaxSwing × (SwingAttr/100) × ConditionMultiplier`. |
| **Variation** | Number of delivery types unlocked AND the visual similarity between them. Higher Variation means the bowling animation looks more identical across delivery types, making it harder for the batter to read. |
| **Control** | Consistency of execution. Each delivery has a `ControlCheck = random(0,100)`. If `ControlCheck > Control`, the delivery drifts from the aimed spot by a random offset. Higher Control = fewer bad balls. |

## 3.3 Fielding Attributes

| Attribute | Gameplay Effect |
|---|---|
| **Catching** | Size of the catch trigger zone and the success probability on difficult chances. `CatchSuccess = Catching/100 × DifficultyFactor`. |
| **Throw Power** | Velocity of throws from the field. Determines how quickly the ball reaches the stumps for run-outs. `ThrowSpeed = 80 + (ThrowPower/100 × 60)` kph. |
| **Throw Accuracy** | Deviation from target on throws. `ThrowDeviation = 2m × (1 - ThrowAccuracy/100)`. |
| **Agility** | Fielder sprint speed and dive range. Affects ground coverage and ability to stop boundaries. `DiveRange = 2m + (Agility/100 × 2m)`. |

## 3.4 Physical / Mental Attributes

| Attribute | Gameplay Effect |
|---|---|
| **Stamina** | Governs fatigue curves. Bowlers lose Accuracy and Pace as stamina depletes per over. `FatiguePenalty = (1 - CurrentStamina/MaxStamina) × 20%`. Batters lose Timing at extreme fatigue. |
| **Consistency** | Reduces variance in all attribute-driven calculations. A consistency-100 player always performs near their attribute ceiling; a consistency-50 player fluctuates. `EffectiveAttr = BaseAttr × (0.7 + 0.3 × Consistency/100 + random × 0.3 × (1 - Consistency/100))`. |
| **Match Awareness** | AI decision quality for computer-controlled players. For human players, this unlocks HUD indicators (pitch map hints, batter weakness overlays). |

