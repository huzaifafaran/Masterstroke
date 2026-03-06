# 5. Batting Mechanics

## 5.1 Shot Timing System

The core batting loop: the bowler delivers → a **timing indicator** appears as the ball approaches → the batter presses the shot button during the timing window.

| Timing Grade | Window Position | Outcome Modifier |
|---|---|---|
| **Perfect** | Center of window | Full power, intended direction, clean contact |
| **Early** | Before center | Ball goes in the air (lofted unintentionally), leading edge risk, reduced power |
| **Late** | After center | Ball goes finer/behind square, trailing edge risk, reduced power |
| **Miss** | Outside window | Complete miss or ball hits pads/body |

**Window Calculation:**
```
TotalWindow = 200ms (fixed for all players)
PerfectZone = 40 + (Timing × 0.6) ms        // 40–100ms
EarlyZone = (TotalWindow - PerfectZone) / 2
LateZone = (TotalWindow - PerfectZone) / 2
```

Difficulty modes scale `TotalWindow`: Easy ×1.3, Medium ×1.0, Hard ×0.7.

## 5.2 Shot Control — 360° Directional System

The batter uses the **left stick** to aim the shot direction across 360°. The field is divided into **12 primary zones** (expanded to 20 for AB de Villiers):

```
        Mid-Off    Mid-On
   Cover    |    |    Mid-Wicket
Extra       |    |         Square
Cover  ---- BATTER ----  Leg
   Point    |    |    Fine Leg
        Third Man  Leg Slip
```

**Direction + Shot Type** combine to produce the final trajectory. The `ShotPlacement` attribute determines how closely the ball follows the aimed direction.

## 5.3 Shot Types

| Category | Shots | Input | Risk Level |
|---|---|---|---|
| **Defensive** | Forward defense, Back-foot block | Button A (light press) | ⚡ Low |
| **Drives** | Cover drive, Straight drive, On drive | Button A + direction | ⚡⚡ Medium |
| **Pull/Hook** | Pull shot, Hook shot | Button B + back-direction (short ball) | ⚡⚡⚡ Medium-High |
| **Sweep** | Sweep, Reverse sweep, Paddle | Button B + leg-side (vs spin) | ⚡⚡⚡ Medium-High |
| **Lofted** | Lofted drive, Lofted pull | Button A + hold modifier | ⚡⚡⚡⚡ High |
| **Innovative** | Ramp, Scoop, Switch hit, Dilscoop | Button Y + direction | ⚡⚡⚡⚡⚡ Very High |

## 5.4 Shot Outcome Calculation

```
function calculateShotOutcome(timing, shotType, ballType, playerAttrs):
    
    // Base exit velocity
    baseVelocity = SHOT_BASE_VELOCITY[shotType]
    powerMult = 0.6 + (playerAttrs.power / 250)
    timingMult = TIMING_MULTIPLIER[timing]  // Perfect=1.0, Early=0.6, Late=0.7
    
    exitVelocity = baseVelocity × powerMult × timingMult
    
    // Direction accuracy
    intendedAngle = playerInput.aimAngle
    deviation = 15° × (1 - playerAttrs.shotPlacement / 100)
    if timing != "Perfect": deviation *= 1.5
    actualAngle = intendedAngle + random(-deviation, +deviation)
    
    // Shot-ball matchup
    matchupBonus = getShotBallMatchup(shotType, ballType, ballLength)
    // e.g., Pull vs Short ball = +20% power; Drive vs Yorker = high miss chance
    
    // Edge detection
    edgeChance = calculateEdgeChance(timing, shotType, ballType)
    
    // Risk penalty for aggressive shots
    riskPenalty = SHOT_RISK[shotType] × (1 - playerAttrs.timing / 150)
    
    return { exitVelocity, actualAngle, edgeChance, riskPenalty }
```

## 5.5 Risk vs Reward Mechanic

| Shot Risk Level | Perfect Timing Reward | Mistimed Penalty |
|---|---|---|
| Low (defensive) | Safe single/dot | Rarely punished |
| Medium (drives) | Boundary through gaps | Possible catch to fielder |
| High (lofted) | Six/big boundary | Catch in outfield (30% edge chance if mistimed) |
| Very High (innovative) | Spectacular boundary | Bowled/LBW/top edge (50%+ dismissal on mistime) |

**Key Formula:**
```
DismissalRisk = BaseRisk[shotType] × (1 - timing_quality) × (1 - composure_factor)
```

---

# 6. Bowling Mechanics

## 6.1 Delivery Selection

### Fast Bowling Menu
| Delivery | Length | Effect |
|---|---|---|
| **Yorker** | Full/toe-crushing | Hardest to score, hardest to execute |
| **Bouncer** | Short/chest-head | Intimidation, pulls mistimed catches |
| **Good Length** | Default | Consistent pressure |
| **Full Length** | Driving length | Invites drive, can swing |
| **Slower Ball** | Deceptive pace change | Mistimes batter if unread |
| **In-Swing** | Varies | Moves into right-hander |
| **Out-Swing** | Varies | Moves away from right-hander |

### Spin Bowling Menu
| Delivery | Effect |
|---|---|
| **Off Spin** | Turns from off to leg |
| **Leg Spin** | Turns from leg to off |
| **Doosra** | Disguised wrong-un for off-spinner |
| **Googly** | Disguised wrong-un for leg-spinner |
| **Flighted** | Slower, more drift and turn |
| **Arm Ball** | Goes straight, looks like spin |

## 6.2 Bowling Execution System

**Step 1 — Select Delivery Type** (from menu above)

**Step 2 — Aim Target** (move reticle on pitch map)
- Reticle size determined by `Accuracy` attribute
- `AimConeRadius = 30cm × (1 - Accuracy / 125)`

**Step 3 — Release Timing** (meter-based)
- A timing meter appears during run-up
- Perfect release = delivery lands in reticle center
- Mistimed release = delivery drifts within cone
- `ReleaseAccuracy = ControlCheck > Control ? random_drift : aimed_spot`

**Step 4 — Variation Button** (optional deception input)
- For slower balls/doosras: press a secondary button at the right moment
- Success disguises the delivery animation
- Failure makes the variation obvious to the batter

## 6.3 Deception Mechanics

```
function canBatterReadDelivery(bowler, batter, deliveryType):
    bowlerDisguise = bowler.variation × 0.7 + bowler.control × 0.3
    batterRead = batter.matchAwareness × 0.6 + batter.timing × 0.4
    
    baseReadChance = 0.5 + (batterRead - bowlerDisguise) / 200
    
    // Signature ability modifiers
    if bowler.signatureAbility.affectsDisguise:
        baseReadChance -= bowler.signatureAbility.disguiseBonus
    
    return random() < clamp(baseReadChance, 0.1, 0.95)
```

If the batter **cannot read** the delivery: timing window shrinks by 30%, shot selection may be wrong.

## 6.4 Stamina & Bowling Fatigue

```
StaminaDrain per over = 100 / (StaminaAttribute × 0.15)
FatiguePenalty = (1 - CurrentStamina / MaxStamina) × 20%
// Applied to: Pace, Accuracy, Swing
EffectivePace = BasePace × (1 - FatiguePenalty)
```

Bowlers must be rotated. A pace bowler with 70 Stamina can bowl ~8 overs before significant degradation.

## 6.5 Strategic Bowling

Bowlers outplay batters through:
- **Pattern Setup:** Bowl 3 outswingers, then an inswinger to surprise
- **Length Variation:** Mix yorkers with bouncers to disrupt footwork
- **Pace Change:** A slower ball after 3 fast deliveries catches the batter early
- **Field-Bowling Coordination:** Set a slip cordon and bowl the corridor; set deep square and bowl short

---

# 7. Pitch & Environmental Systems

## 7.1 Pitch Types

| Pitch Type | Batting Modifier | Pace Modifier | Spin Modifier | Bounce |
|---|---|---|---|---|
| **Batting Friendly** | Timing +10% | Swing -20% | Turn -30% | True, even |
| **Pace Friendly** | Timing -10% | Swing +20%, Seam +25% | Turn -10% | Extra bounce, variable |
| **Spin Friendly** | Timing -5% vs spin | Swing -10% | Turn +40%, Drift +20% | Low, variable |
| **Worn Pitch** | Timing -15% | Swing -15% | Turn +60% | Uneven, dangerous |

Pitches **degrade over time**: a Day 1 batting pitch becomes a Day 3 worn pitch across the match.

## 7.2 Environmental Conditions

| Condition | Effect |
|---|---|
| **Humidity > 70%** | Swing +30%. Ball stays newer longer. Pace bowlers favored. |
| **Dew (evening sessions)** | Spin -40%. Wet ball harder to grip. Batting easier in 2nd innings. |
| **Overcast** | Swing +20%. Visibility slightly reduced (timing window -5%). |
| **Hot & Dry** | Pitch cracks faster (accelerates wear). Stamina drain +20%. |

## 7.3 Match Pressure System

```
PressureLevel = f(RequiredRunRate, WicketsLost, OversRemaining, MatchStage)

Scale: 0.0 (no pressure) → 1.0 (maximum pressure)

Effect on batters:
  TimingWindow *= (1 - PressureLevel × 0.3 × (1 - Composure/100))
  ShotPlacement -= PressureLevel × 10 × (1 - Composure/100)

Effect on bowlers:
  Accuracy += PressureLevel × 5  (bowlers improve slightly under pressure)
```

---

# 8. Ball Physics Model

## 8.1 Core Physics Parameters

| Parameter | Description | Range |
|---|---|---|
| **Speed** | Velocity in kph, decays from hand to bat | 90–160 kph |
| **Spin (RPM)** | Revolutions per minute, determines turn | 0–2400 |
| **Swing** | Lateral movement in air (before bounce) | 0–1.2m deviation |
| **Seam** | Lateral movement off pitch (after bounce) | 0–0.8m |
| **Bounce Height** | Determined by length + pitch + speed | 0.1m–2.0m |

## 8.2 Ball Trajectory Calculation

```
Pre-bounce trajectory:
  horizontalPos(t) = releasePoint + velocity × t + swingCurve(t)
  swingCurve(t) = swingMagnitude × sin(π × t / flightTime)  // peaks mid-flight

Post-bounce:
  speed *= bounceFriction (0.75–0.90 based on pitch)
  lateralDeviation = spinRPM × turnCoefficient × pitchTurnModifier
  bounceHeight = f(length, speed, pitchBounce)
  
  // Variable bounce on worn pitches:
  if pitch.isWorn: bounceHeight += random(-0.15m, +0.15m)
```

## 8.3 Edge Detection

Edges occur when the ball makes off-center contact with the bat. The system calculates:

```
contactOffset = |ballLine - batCenterLine|
edgeThreshold = 0.08m  // 8cm from bat center

if contactOffset > edgeThreshold:
    edgeType = contactOffset > 0.12m ? "thick_edge" : "fine_edge"
    // Thick edge: goes fast, catchable at slip/gully
    // Fine edge: goes behind, keeper catch
    exitAngle = deflect based on offset direction
    exitSpeed = baseSpeed × 0.3–0.6 (reduced)
```

**Edge probability increases when:**
- Timing ≠ Perfect (+25% edge zone)
- Ball moving laterally (swing/turn) (+15% per 0.3m of movement)
- Wrong shot selection (e.g., driving a ball that's cutting away)

## 8.4 Bat Impact Physics

```
if timing == "Perfect":
    exitVelocity = maxExitVelocity × powerMultiplier
    launchAngle = intendedAngle ± minDeviation
    sweetSpotBonus = 1.15  // 15% extra power from middle of bat

if timing == "Early":
    exitVelocity *= 0.6
    launchAngle += 15°  // ball goes higher than intended
    leadingEdgeRisk = 0.2

if timing == "Late":
    exitVelocity *= 0.7
    launchAngle -= 10°  // ball goes finer
    trailingEdgeRisk = 0.15
```

