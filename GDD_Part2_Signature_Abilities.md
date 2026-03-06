# 4. Signature Player Abilities

Each player has a **Signature Ability** — a passive or activatable modifier that alters core gameplay systems. These are balanced to be powerful but situational.

## Ability Framework

```
SignatureAbility {
  name: string
  trigger: "passive" | "situational" | "activatable"
  condition: MatchCondition        // when it activates
  effect: AttributeModifier[]      // what changes
  duration: "permanent" | overs    // how long
  cooldown: overs (if activatable)
}
```

## Player Roster & Abilities

### 🏏 BATTERS

**Virat Kohli — "Chase Master"**
- **Trigger:** Activates when batting second and required run rate > 6.0
- **Effect:** Timing window +20%, Composure +25, Shot Placement +10
- **System Math:** `PerfectWindow *= 1.2`, pressure penalty reduced by extra 25%
- **Design Intent:** Kohli becomes significantly harder to dismiss in chase situations, mirroring his legendary chase record

**Sachin Tendulkar — "Master Blaster Legacy"**
- **Trigger:** Passive — always active
- **Effect:** Consistency set to 95 (floor). Timing +10 when batting on pitches rated "difficult"
- **System Math:** Variance in `EffectiveAttr` formula drops to near zero. `PerfectWindow += 6ms` on hard pitches
- **Design Intent:** Tendulkar is the most reliable batter in the game; never has off days

**AB de Villiers — "360° Mastery"**
- **Trigger:** Passive
- **Effect:** Unlocks 8 additional unconventional shot angles (scoop, ramp, reverse-lap, switch hit). Mistiming penalty on innovative shots reduced by 50%
- **System Math:** `InnovativeShotDeviation *= 0.5`. Shot angle selection expanded from 12 to 20 zones
- **Design Intent:** AB can score in areas other batters simply cannot access

**Chris Gayle — "Universe Boss"**
- **Trigger:** Activates after hitting 2 consecutive boundaries
- **Effect:** Power +20, six distance +15%. Timing window for lofted shots +15%
- **System Math:** `ExitVelocity *= 1.15` on lofted shots. `LoftedPerfectWindow *= 1.15`
- **Design Intent:** Gayle gets into a rhythm and becomes nearly unstoppable in power hitting

**Shahid Afridi — "Boom Boom"**
- **Trigger:** Passive
- **Effect:** Power +25, six distance +25%. BUT Timing window -15% on defensive shots, Composure -15
- **System Math:** `ExitVelocity *= 1.25` on attacking shots. `DefensivePerfectWindow *= 0.85`
- **Design Intent:** Maximum risk/reward archetype. Afridi will either destroy the bowling or get out cheaply

**Brian Lara — "The Prince"**
- **Trigger:** Activates once batter reaches 30+ runs (settled in)
- **Effect:** Shot Placement +20, Timing +15, Footwork +10
- **System Math:** `DeviationAngle *= 0.8`, `PerfectWindow += 9ms`
- **Design Intent:** Lara builds innings and becomes progressively more dangerous; rewards patience

### 🎯 BOWLERS

**Lasith Malinga — "Death Over Specialist"**
- **Trigger:** Overs 16–20 in limited-overs formats
- **Effect:** Yorker Accuracy +30, Slower Ball disguise +40%
- **System Math:** `YorkerAimCone *= 0.4`. Slower ball animation blending increases to near-identical to stock delivery
- **Design Intent:** Malinga at the death is the hardest bowler to score off; yorkers are pinpoint

**Wasim Akram — "Sultan of Swing"**
- **Trigger:** Passive, enhanced when humidity > 60%
- **Effect:** Swing +25, Reverse Swing unlocked earlier (ball age 25 overs instead of 40)
- **System Math:** `SwingDeviation *= 1.5`. Reverse swing threshold reduced
- **Design Intent:** Akram moves the ball both ways prodigiously; environmental conditions amplify him

**Muttiah Muralitharan — "Spin Wizard"**
- **Trigger:** Passive, enhanced on spin-friendly pitches
- **Effect:** Turn +20, Variation disguise +35%. Batters' read-spin success rate reduced by 30%
- **System Math:** `SpinRPM += 400`. `BatterSpinReadChance *= 0.7`. Animation blending between doosra/off-spin becomes nearly identical
- **Design Intent:** Murali is the most deceptive spinner; batters genuinely struggle to pick his variations

**Shane Warne — "Leg Spin Sorcery"**
- **Trigger:** Passive
- **Effect:** Leg spin turn +15, Drift in air +25%. Googly accuracy +20
- **System Math:** `AirDrift += 0.3m lateral`. Googly `AimCone *= 0.7`
- **Design Intent:** Warne's deliveries curve in the air AND off the pitch, creating a dual-axis puzzle

**Dale Steyn — "Express Pace"**
- **Trigger:** Activates in first 5 overs of an innings (new ball)
- **Effect:** Pace +10 (can exceed 150kph), Swing +15, Intimidation aura (opposing batter Composure -10)
- **System Math:** `DeliverySpeed += 8kph`. Batter's `PressurePenalty += 0.1`
- **Design Intent:** Steyn with the new ball is the most fearsome opening spell in the game

### 🏟️ ALL-ROUNDERS

**Jacques Kallis — "The Complete Cricketer"**
- **Trigger:** Passive
- **Effect:** No single stat below 55 in any discipline. Stamina drain 30% slower
- **System Math:** Attribute floor = 55. `StaminaDrain *= 0.7`
- **Design Intent:** Kallis is the ultimate utility pick; never a liability in any phase

**Shakib Al Hasan — "All-Phase Dominance"**
- **Trigger:** Activates when team needs > 50 runs or > 3 wickets
- **Effect:** Best-discipline attributes +10 (context-dependent)
- **System Math:** If batting needed: batting attrs +10. If bowling needed: bowling attrs +10
- **Design Intent:** Shakib rises to the occasion in pressure moments regardless of role

### 🧤 WICKETKEEPER

**MS Dhoni — "Captain Cool"**
- **Trigger:** Activatable — "Helicopter Shot" (once per innings). Passive: Composure 99
- **Effect (Helicopter):** Unlocks unique shot with extreme power on yorker-length balls. Power +40 on that single shot
- **Effect (Passive):** Immune to pressure penalties. Team pressure reduction aura (-5% pressure to partner)
- **System Math:** Helicopter: `ExitVelocity *= 1.8` on yorkers, only for that single use. `PressurePenalty = 0` always
- **Design Intent:** Dhoni is the ultimate finisher — calm under pressure, with one game-breaking shot per innings

**Kumar Sangakkara — "Elegant Accumulator"**
- **Trigger:** Passive
- **Effect:** Running between wickets speed +15%. Strike rotation to gaps +20% accuracy
- **System Math:** `RunSpeed *= 1.15`. Singles/doubles conversion rate increases. `PlacementAccuracy += 0.2` for ground shots into gaps
- **Design Intent:** Sangakkara rotates strike effortlessly and converts good balls into scoring opportunities

