# 9. AI System Design

## 9.1 Batting AI

The AI batter uses a **decision tree** evaluated per delivery:

```
BattingAI.selectShot(delivery, matchState, playerProfile):
    
    // 1. Read delivery (imperfect based on Match Awareness)
    readSuccess = random() < (matchAwareness / 100)
    perceivedDelivery = readSuccess ? actualDelivery : estimatedDelivery
    
    // 2. Evaluate risk appetite
    riskThreshold = calculateRiskThreshold(matchState, playerProfile)
    // Low wickets left → lower threshold (more defensive)
    // High required rate → higher threshold (more aggressive)
    // Player tendency → Afridi biases +30% aggressive, Sangakkara biases -20%
    
    // 3. Select shot from weighted table
    shotOptions = getShotOptions(perceivedDelivery.length, perceivedDelivery.line)
    for each option:
        weight = baseWeight
        weight *= playerProfile.shotPreference[option]  // player-specific
        weight *= riskAlignment(option.risk, riskThreshold)
        weight *= matchupScore(option, perceivedDelivery)
    
    selectedShot = weightedRandom(shotOptions)
    
    // 4. Execute with attribute-driven timing
    timingQuality = generateTiming(playerProfile.timing, difficulty)
    
    return { selectedShot, timingQuality }
```

### Player-Specific AI Tendencies
| Player | Tendency |
|---|---|
| Afridi | 70% chance to attempt lofted shot on any hittable delivery |
| Kohli | Priorities: rotate strike early, accelerate after 20 balls |
| Gayle | Will not sweep; strongly prefers pace-hitting over rotation |
| Tendulkar | Balanced shot selection; slightly favors off-side |
| Dhoni | Defensive first 20 balls, then explosive in final 5 overs |

## 9.2 Bowling AI

```
BowlingAI.planDelivery(batter, matchState, recentHistory):
    
    // 1. Analyze batter weaknesses
    batterProfile = getWeaknesses(batter)
    // e.g., "struggles against short ball on off-stump"
    
    // 2. Set field for the plan
    if plan == "bouncer_attack":
        setField("short_leg_heavy")
    elif plan == "swing_corridor":
        setField("slip_cordon")
    
    // 3. Select delivery based on setup history
    if last3Deliveries.allOutswing:
        surpriseValue = inswinger  // high surprise bonus
    
    // 4. Choose variation based on batter's recent shots
    if batter.recentlyPlayed("front_foot_drive") > 2:
        prefer = "short_of_length"  // deny the drive
    
    // 5. Execute with bowler's attributes
    deliveryQuality = executeDelivery(bowlerAttrs, fatigue)
```

### Strategic Patterns
- **Test a batter's weakness** with 2–3 similar deliveries, then exploit with the trap ball
- **Build dot-ball pressure** in limited-overs to force risky shots
- **Bowl to field settings** — AI coordinates delivery and field

## 9.3 Difficulty Scaling

| Parameter | Easy | Medium | Hard |
|---|---|---|---|
| Batter timing window | ×1.3 | ×1.0 | ×0.7 |
| AI shot selection quality | 50% optimal | 75% optimal | 95% optimal |
| AI bowling accuracy | Random drift +50% | Base | Pinpoint (-20% cone) |
| AI field placement | Generic | Matchup-based | Fully dynamic |
| Batter read success | Always reads | 70% | 50% |

---

# 10. Fielding System

## 10.1 Manual Field Placement

Before each over, the captain can manually place all 9 fielders (excluding bowler and keeper) using a **top-down field grid**. Preset templates are available:

| Preset | Description |
|---|---|
| Attacking | 3 slips, gully, short leg |
| Defensive | Deep cover, deep mid-wicket, long-on, long-off |
| Death Overs | Yorker field — long-on, long-off, deep square |
| Spin Attack | Silly point, short leg, slip, leg slip |

Fielding restrictions (powerplay rules) are enforced in limited-overs formats.

## 10.2 Catching Mechanics

When a catch opportunity arises, the game enters a **catching mini-game**:

- A **catch indicator** appears around the fielder
- The player must:
  1. Move to position (via left stick — determined by `Agility`)
  2. Press the catch button within a timing window
  3. Window size = `40 + Catching × 0.5` ms

**Catch Difficulty Tiers:**
| Tier | Example | Base Success Rate |
|---|---|---|
| Regulation | Gentle lob to fielder | 95% |
| Good | Fast shot, directly at fielder | 80% |
| Difficult | Diving catch, needs lateral movement | 50% |
| Spectacular | Full-stretch dive at boundary | 25% |

`FinalCatchRate = BaseTierRate × (Catching / 80) × AgilityModifier`

## 10.3 Run-Out Mechanics

When batters run:
1. Fielder moves to ball (AI-assisted, speed = Agility)
2. Player presses throw button — **aim indicator** targets closest stumps
3. Throw accuracy = `ThrowAccuracy` attribute
4. Throw speed = `ThrowPower` attribute
5. Direct hit check: `HitChance = ThrowAccuracy / 100 - DistancePenalty`

If throw misses stumps, overthrow risk based on throw wildness.

## 10.4 Dive / Sliding Stops

Fielders near the boundary can **dive** (button press) to:
- Stop the ball before the rope (save 2–4 runs)
- Relay throw back
- Diving range = `2m + (Agility / 100 × 2m)`

---

# 11. Game Modes

| Mode | Description |
|---|---|
| **Quick Match** | Pick teams, pick format (T20/ODI/Test), play. Full customization of overs, conditions, difficulty. |
| **Tournament Mode** | Bracket-style tournament: T20 World Cup, ODI Cup, or custom leagues. 4–16 team brackets with progression. |
| **Super Over Mode** | Best-of-3 or best-of-5 super overs. Pure clutch moments. Pick 2 batters, 1 bowler per over. |
| **Career Challenge** | Play as a single player across career-defining scenarios. "Chase 350 as Kohli", "Defend 8 runs in the last over as Malinga". Earn stars for performance. 50+ challenges. |
| **Target Chase Mode** | Given a target and a batting lineup, chase with increasing difficulty. Leaderboard ranked. |
| **Local Multiplayer** | 2-player splitscreen. One bats, one bowls/fields. Hot-seat for same-team batting. |

---

# 12. Graphics & Presentation

## 12.1 Visual Direction

**Art Style:** Stylized realism — realistic proportions with slightly enhanced colors and contrast. Think "broadcast TV look" with cinematic grading. Not photorealistic, but immersive.

**Player Models:**
- Unique face scans / hand-modeled likenesses for all 16 roster players
- Signature batting stances and bowling actions (motion-captured)
- Dynamic cloth simulation on jerseys

**Stadiums:**
- 6 iconic stadiums: MCG, Lord's, Gaddafi Stadium, Eden Gardens, Wankhede, Wanderers
- Dynamic time-of-day lighting (day, day-night, floodlit)
- Volumetric lighting for evening sessions

## 12.2 Camera System

| Camera | Use |
|---|---|
| **Broadcast (Default)** | End-on view, follows ball. Standard cricket TV angle. |
| **Batter Cam** | Over-the-shoulder behind batter. Most immersive for batting. |
| **Bowler Cam** | Behind-the-arm for bowling. Shows full run-up and field. |
| **Stump Cam** | Low angle for replays and dramatic moments. |
| **Helicopter** | Top-down for field placement and strategic view. |
| **Replay System** | Multi-angle, slow-motion replays after wickets and boundaries. Ultra-motion on edges. |

## 12.3 Atmosphere

- Crowd noise scales with match tension (pressure system drives audio mix)
- Player celebrations are unique per cricketer (Afridi bat-swing, Kohli fist-pump)
- Commentary system with contextual callouts for signature abilities and milestones
- Particle effects: dust on pitch impact, ball shine, batting sparks on edges

---

# 13. Technical Architecture

## 13.1 Recommended Engine

**Unreal Engine 5** — chosen for:
- Nanite/Lumen for stadium rendering
- Superior physics and animation blending (Control Rig)
- C++ performance for real-time physics simulation
- MetaHuman pipeline for stylized player faces
- Mature multiplayer framework

## 13.2 Systems Architecture

```
┌─────────────────────────────────────────────────┐
│                  GAME MANAGER                    │
│  (Match State, Rules, Scoring, Overs, Innings)  │
├──────────┬──────────┬──────────┬────────────────┤
│  INPUT   │ GAMEPLAY │ PHYSICS  │  PRESENTATION  │
│ SYSTEM   │ SYSTEMS  │ ENGINE   │    LAYER       │
│          │          │          │                │
│ Gamepad  │ Batting  │ Ball     │ Camera Mgr    │
│ Keyboard │ Bowling  │ Traj.    │ UI/HUD        │
│ Touch    │ Fielding │ Collision│ VFX/Audio     │
│          │ AI       │ Edge Det.│ Replay System │
├──────────┴──────────┴──────────┴────────────────┤
│              PLAYER DATA SYSTEM                  │
│  (Attributes, Abilities, Fatigue, Stats Tracker) │
├─────────────────────────────────────────────────┤
│            ANIMATION CONTROLLER                  │
│  (State Machine, Motion Matching, IK, Blending) │
└─────────────────────────────────────────────────┘
```

## 13.3 Player Data Structure

```cpp
USTRUCT(BlueprintType)
struct FPlayerData {
    UPROPERTY() FName PlayerName;
    UPROPERTY() EPlayerRole Role;  // Batter, Bowler, AllRounder, Keeper
    
    // Batting
    UPROPERTY() int32 Timing;         // 0-100
    UPROPERTY() int32 ShotPlacement;  // 0-100
    UPROPERTY() int32 Power;          // 0-100
    UPROPERTY() int32 Footwork;       // 0-100
    UPROPERTY() int32 Composure;      // 0-100
    
    // Bowling
    UPROPERTY() int32 PaceOrSpin;     // 0-100
    UPROPERTY() int32 Accuracy;       // 0-100
    UPROPERTY() int32 SwingOrTurn;    // 0-100
    UPROPERTY() int32 Variation;      // 0-100
    UPROPERTY() int32 Control;        // 0-100
    
    // Fielding
    UPROPERTY() int32 Catching;       // 0-100
    UPROPERTY() int32 ThrowPower;     // 0-100
    UPROPERTY() int32 ThrowAccuracy;  // 0-100
    UPROPERTY() int32 Agility;        // 0-100
    
    // Physical/Mental
    UPROPERTY() int32 Stamina;        // 0-100
    UPROPERTY() int32 Consistency;    // 0-100
    UPROPERTY() int32 MatchAwareness; // 0-100
    
    // Signature
    UPROPERTY() FSignatureAbility Signature;
};
```

## 13.4 Ability Modifier Framework

```cpp
USTRUCT()
struct FSignatureAbility {
    FName AbilityName;
    EAbilityTrigger Trigger;  // Passive, Situational, Activatable
    
    // Condition check
    TFunction<bool(FMatchState)> IsActive;
    
    // Attribute modifiers (additive / multiplicative)
    TArray<FAttributeModifier> Modifiers;
    
    // Duration
    int32 DurationOvers;  // -1 = permanent
    int32 CooldownOvers;  // for activatable
    int32 UsesPerInnings; // for activatable
};

// Applied every frame during gameplay:
void ApplySignatureModifiers(FPlayerData& Player, FMatchState State) {
    if (Player.Signature.IsActive(State)) {
        for (auto& Mod : Player.Signature.Modifiers) {
            int32& Attr = Player.*Mod.AttributePtr;
            Attr = FMath::Clamp(
                Mod.IsMultiplicative ? Attr * Mod.Value : Attr + Mod.Value,
                0, 100
            );
        }
    }
}
```

## 13.5 Event-Based Gameplay Logic

The match loop uses an **event-driven architecture**:

```
Events:
  OnBallBowled        → triggers physics, starts timing window
  OnBatContact        → calculates outcome, triggers fielding
  OnBallFielded       → handles runs, run-out checks
  OnWicketFallen      → triggers replay, updates scoreboard, AI recalculates
  OnOverComplete      → bowler rotation, fatigue update, field reset
  OnInningsComplete   → switch batting/bowling, conditions update
  OnMatchEnd          → results screen, stat summary
  OnAbilityTriggered  → VFX, HUD notification, modifier applied
```

---

# 14. Example Player Stat Table

| Player | Role | Tim | SP | Pow | Ftw | Com | Pac/Spn | Acc | Sw/Tn | Var | Ctrl | Cat | TPw | TAc | Agi | Sta | Con | MA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Virat Kohli** | Bat | 95 | 92 | 78 | 90 | 96 | — | — | — | — | — | 75 | 70 | 72 | 80 | 92 | 95 | 94 |
| **Sachin Tendulkar** | Bat | 97 | 95 | 82 | 93 | 90 | — | — | — | — | — | 70 | 65 | 68 | 72 | 88 | 98 | 96 |
| **AB de Villiers** | Bat/WK | 93 | 90 | 85 | 88 | 88 | — | — | — | — | — | 90 | 78 | 80 | 92 | 90 | 88 | 90 |
| **Chris Gayle** | Bat | 82 | 75 | 98 | 68 | 80 | — | — | — | — | — | 60 | 65 | 60 | 55 | 78 | 72 | 75 |
| **Shahid Afridi** | AR | 72 | 65 | 96 | 60 | 55 | 78 | 62 | 55 | 70 | 58 | 65 | 68 | 65 | 70 | 80 | 45 | 60 |
| **Brian Lara** | Bat | 96 | 94 | 80 | 92 | 85 | — | — | — | — | — | 68 | 62 | 65 | 70 | 85 | 88 | 92 |
| **Lasith Malinga** | Bowl | — | — | — | — | — | 88 | 85 | 72 | 90 | 82 | 50 | 55 | 55 | 55 | 78 | 80 | 82 |
| **Wasim Akram** | Bowl | — | — | — | — | — | 92 | 88 | 95 | 88 | 90 | 55 | 60 | 60 | 60 | 85 | 90 | 90 |
| **M. Muralitharan** | Bowl | — | — | — | — | — | 95 | 90 | 98 | 96 | 88 | 55 | 50 | 52 | 55 | 92 | 92 | 88 |
| **Shane Warne** | Bowl | — | — | — | — | — | 90 | 86 | 92 | 94 | 92 | 65 | 58 | 60 | 62 | 82 | 90 | 94 |
| **Dale Steyn** | Bowl | — | — | — | — | — | 96 | 90 | 88 | 82 | 88 | 60 | 62 | 65 | 68 | 80 | 88 | 85 |
| **Jacques Kallis** | AR | 88 | 85 | 82 | 84 | 90 | 82 | 80 | 78 | 72 | 84 | 85 | 78 | 80 | 75 | 95 | 94 | 92 |
| **Shakib Al Hasan** | AR | 82 | 78 | 72 | 78 | 82 | 80 | 82 | 80 | 78 | 80 | 72 | 68 | 70 | 75 | 88 | 85 | 85 |
| **MS Dhoni** | WK/Bat | 88 | 82 | 90 | 80 | 99 | — | — | — | — | — | 92 | 85 | 88 | 78 | 90 | 85 | 95 |
| **K. Sangakkara** | WK/Bat | 92 | 90 | 76 | 88 | 92 | — | — | — | — | — | 88 | 72 | 78 | 80 | 88 | 92 | 93 |

> **Legend:** Tim=Timing, SP=Shot Placement, Pow=Power, Ftw=Footwork, Com=Composure, Pac/Spn=Pace or Spin, Acc=Accuracy, Sw/Tn=Swing or Turn, Var=Variation, Ctrl=Control, Cat=Catching, TPw=Throw Power, TAc=Throw Accuracy, Agi=Agility, Sta=Stamina, Con=Consistency, MA=Match Awareness. "—" indicates non-primary discipline (value exists but is low, not shown for clarity).

---

*End of Game Design Document — Cricket Legends v1.0*
