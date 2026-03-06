// ============================================================
// CRICKET LEGENDS — Main Application Controller
// ============================================================

class CricketLegendsApp {
    constructor() {
        this.engine = null;
        this.batting = null;
        this.bowling = null;
        this.ai = null;
        this.commentary = new CommentarySystem();
        this.renderer = null;
        this.gamePhase = 'menu'; // menu, toss, batting, bowling, inningsBreak, result
        this.playerRole = 'bat'; // bat or bowl
        this.animating = false;
        this.selectedTeam1 = 'legends_xi';
        this.selectedTeam2 = 'world_xi';
        this.selectedOvers = 5;
        this.selectedDifficulty = 'medium';
        this.selectedPitch = PITCH_TYPES[0];
        this.gameMode = 'quick'; // quick, superover
        this.loopId = null;
        this.lastFrameTime = 0;
    }

    // ── Initialize ─────────────────────────────────────────
    init() {
        this.bindMenuEvents();
        this.showScreen('menu-screen');
        this.populateTeamSelectors();
        this.renderEmojis(document.body);
    }

    // ── Screen Management ──────────────────────────────────
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(id);
        if (screen) screen.classList.add('active');
    }

    // ── Menu Events ────────────────────────────────────────
    bindMenuEvents() {
        document.getElementById('btn-quick-match')?.addEventListener('click', () => {
            this.gameMode = 'quick';
            this.showScreen('setup-screen');
        });

        document.getElementById('btn-super-over')?.addEventListener('click', () => {
            this.gameMode = 'superover';
            this.selectedOvers = 1;
            this.selectedTeam1 = 'legends_xi';
            this.selectedTeam2 = 'world_xi';
            this.selectedDifficulty = 'hard';
            this.selectedPitch = PITCH_TYPES[0];
            this.startMatch();
        });

        document.getElementById('btn-duel-mode')?.addEventListener('click', () => {
            this.gameMode = 'duel';
            this.selectedOvers = 1;
            this.selectedTeam1 = 'legends_xi';
            this.selectedTeam2 = 'world_xi';
            this.startMatch();
        });

        document.getElementById('btn-start-match')?.addEventListener('click', () => this.startMatch());

        document.getElementById('sel-team1')?.addEventListener('change', (e) => this.selectedTeam1 = e.target.value);
        document.getElementById('sel-team2')?.addEventListener('change', (e) => this.selectedTeam2 = e.target.value);
        document.getElementById('sel-overs')?.addEventListener('change', (e) => this.selectedOvers = parseInt(e.target.value));
        document.getElementById('sel-difficulty')?.addEventListener('change', (e) => this.selectedDifficulty = e.target.value);
        document.getElementById('sel-pitch')?.addEventListener('change', (e) => {
            this.selectedPitch = PITCH_TYPES.find(p => p.id === e.target.value) || PITCH_TYPES[0];
        });

        document.getElementById('btn-back-menu')?.addEventListener('click', () => this.showScreen('menu-screen'));
        document.getElementById('btn-play-again')?.addEventListener('click', () => window.location.reload());
    }

    populateTeamSelectors() {
        ['sel-team1', 'sel-team2'].forEach(selId => {
            const sel = document.getElementById(selId);
            if (!sel) return;
            sel.innerHTML = '';
            Object.entries(TEAMS).forEach(([key, team]) => {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = team.name;
                sel.appendChild(opt);
            });
        });
        const sel2 = document.getElementById('sel-team2');
        if (sel2) sel2.value = 'world_xi';

        // Overs
        const selOvers = document.getElementById('sel-overs');
        if (selOvers) {
            selOvers.innerHTML = '';
            [1, 2, 5, 10, 20].forEach(o => {
                const opt = document.createElement('option');
                opt.value = o;
                opt.textContent = `${o} Over${o > 1 ? 's' : ''}`;
                if (o === 5) opt.selected = true;
                selOvers.appendChild(opt);
            });
        }

        // Pitch
        const selPitch = document.getElementById('sel-pitch');
        if (selPitch) {
            selPitch.innerHTML = '';
            PITCH_TYPES.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                selPitch.appendChild(opt);
            });
        }
    }

    // ── Start Match ────────────────────────────────────────
    startMatch() {
        const feed = document.getElementById('commentary-feed');
        if (feed) feed.innerHTML = '';

        const team1Players = getTeamPlayers(this.selectedTeam1);
        const team2Players = getTeamPlayers(this.selectedTeam2);

        this.engine = new MatchEngine({
            team1: team1Players,
            team2: team2Players,
            totalOvers: this.gameMode === 'superover' ? 1 : this.selectedOvers,
            pitch: this.selectedPitch,
            difficulty: this.selectedDifficulty
        });

        this.batting = new BattingSystem(this.engine);
        this.bowling = new BowlingSystem(this.engine);
        this.commentary = new CommentarySystem();
        this.gameController = new GameController(this.engine, this.batting, this.bowling, this.commentary);

        this.renderer = new GameRenderer('game-canvas');
        this.sprites = new SpriteOverlay();

        // Bind GameController events
        this.gameController.on('phaseChange', (data) => {
            this.gamePhase = data.phase;
            this.updatePlayerInfo();
            this.updateScoreboard();
        });
        
        this.gameController.on('ballReadyHumanBatting', (data) => {
            this.currentDeliveryResult = data.deliveryResult;
            this.showBattingControls();
            this.showDeliveryInfo(data.deliveryResult);
            this.hideTimingBar();
            this.bindBattingInput();
            
            const autoShot = this.lastPlayedShot || SHOT_TYPES.find(s => s.id === 'drive');
            if (autoShot) {
                setTimeout(() => this.selectShot(autoShot), 50);
            }
        });
        
        this.gameController.on('ballReadyHumanBowling', (data) => {
            this.showBowlingControls();
            this.bindBowlingInput();
            
            const autoDelivery = this.lastBowledDeliveryId || this.bowling.getAvailableDeliveries()[0].id;
            if (autoDelivery) {
                setTimeout(() => this.selectAndBowl(autoDelivery), 50);
            }
        });

        this.gameController.on('ballComplete', (data) => {
            const outcome = data.outcome;
            this.renderer.animateBall(outcome, () => {
                if (outcome.wicket) this.renderer.wicketEffect();
                if (outcome.six) this.renderer.boundaryEffect(true);
                else if (outcome.boundary) this.renderer.boundaryEffect(false);

                const spriteDuration = outcome.wicket ? 2200 : outcome.six ? 2000 : outcome.boundary ? 1600 : 1000;
                this.sprites.show(outcome, spriteDuration);

                this.addCommentary(data.commentary, outcome.wicket ? 'wicket' : outcome.six ? 'six' : outcome.boundary ? 'four' : 'normal');

                this.updateScoreboard();
                this.updatePlayerInfo();
                this.showTimingResult(outcome.timing);

                setTimeout(() => {
                    this.animating = false;
                }, spriteDuration);
            });
        });

        this.gameController.on('matchEnd', (data) => this.onMatchEnd(data));
        this.gameController.on('duelEnd', (data) => this.onMatchEnd(data));
        this.gameController.on('turnStart', (data) => {
            if (data.playerNum === 1) {
                this.addCommentary(`🏏 Player 1 batting first (${data.balls} balls). Set a strong target.`, 'innings');
            } else {
                this.addCommentary(`🎯 Player 2 chasing ${data.target} in ${data.balls} balls.`, 'innings');
            }
            this.updateScoreboard();
            this.updatePlayerInfo();
        });
        this.gameController.on('duelTargetSet', (data) => {
            this.addCommentary(`🎯 Target for Player 2: ${data.target}`, 'innings');
            this.updateScoreboard();
        });
        this.gameController.on('turnEnd', (data) => {
            const runs = data.score?.runs ?? 0;
            const balls = data.score?.balls ?? 0;
            this.addCommentary(`📋 End of Player ${data.playerNum} turn: ${runs} (${balls})`, 'over');
        });

        this.gameController.on('tossDecisionFinal', (data) => {
             this.addCommentary(`${data.winner} won the toss and chose to ${data.choice}.`, 'normal');
        });

        this.gameController.on('tossComplete', (data) => {
            if (data.winner === 'team1') {
                const overlay = document.getElementById('toss-overlay');
                if (overlay) {
                    overlay.classList.remove('hidden');
                    const title = document.getElementById('toss-title');
                    if (title) title.innerHTML = '<span class="black-emoji">🪙</span> You won the toss!';
                }

                const batBtn = document.getElementById('btn-toss-bat');
                const bowlBtn = document.getElementById('btn-toss-bowl');

                const handleChoice = (choice) => {
                    overlay.classList.add('hidden');
                    this.gameController.currentModeCtrl.setTossChoice(choice, true);
                    batBtn.onclick = null;
                    bowlBtn.onclick = null;
                };

                batBtn.onclick = () => handleChoice('bat');
                bowlBtn.onclick = () => handleChoice('bowl');
            }
        });

        this.showScreen('game-screen');
        // Force the renderer to recalculate dimensions now that the container is visible
        if (this.renderer) {
            this.renderer.resize();
        }

        this.gamePhase = 'toss';
        this.updateScoreboard();
        this.startGameLoop();

        // Start appropriate mode
        if (this.gameMode === 'duel') {
            this.gameController.startDuel({
                player1BatterId: team1Players[0].id,
                player2BatterId: team2Players[0].id,
                bowlerId: 'akram', // Default challenging bowler for both
                ballsPerPlayer: this.selectedOvers * 6
            });
        } else {
            this.gameController.startVsAI({ humanTeamId: 'team1' });
        }
    }

    // ── Game Loop ──────────────────────────────────────────
    startGameLoop() {
        if (this.loopId) cancelAnimationFrame(this.loopId);
        this.lastFrameTime = performance.now();

        const loop = (timestamp) => {
            const deltaTime = (timestamp - this.lastFrameTime) / 1000;
            this.lastFrameTime = timestamp;

            this.update(deltaTime);
            this.draw();

            this.loopId = requestAnimationFrame(loop);
        };
        this.loopId = requestAnimationFrame(loop);
    }

    stopGameLoop() {
        if (this.loopId) {
            cancelAnimationFrame(this.loopId);
            this.loopId = null;
        }
    }

    update(deltaTime) {
        if (this.gamePhase === 'batting_human' && this.batting.timingBarActive) {
            this.batting.updateTimingBar(deltaTime);
            this.updateTimingBarCursor();
        }
        if (this.gamePhase === 'bowling_human' && this.bowling.executionMeterActive) {
            this.bowling.updateExecutionMeter(deltaTime);
            this.updateBowlingMeterCursor();
        }
    }

    draw() {
        if (!this.renderer) return;
        this.renderer.render(this.engine.state);

        if (this.gamePhase === 'bowling_human' && this.bowling.executionMeterActive) {
            const bowlerAttrs = this.engine.getEffectiveAttributes(this.engine.getCurrentBowler(), 'bowling');
            const coneRadius = 30 * (1 - bowlerAttrs.accuracy / 125);
            this.renderer.drawBowlingTarget(this.bowling.aimX, this.bowling.aimY, coneRadius, true);
        }
    }

    // ── HTML Timing Bar ────────────────────────────────────
    showTimingBar() {
        const overlay = document.getElementById('timing-bar-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    hideTimingBar() {
        const overlay = document.getElementById('timing-bar-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    updateTimingBarCursor() {
        const cursor = document.getElementById('timing-bar-cursor');
        if (cursor) {
            const pos = this.batting.timingBarPosition; // 0-100
            cursor.style.left = `calc(${pos}% - 2px)`;
        }
    }

    updateBowlingMeterCursor() {
        const cursor = document.getElementById('bowling-cursor');
        if (cursor) {
            const pos = this.bowling.executionPosition; // 0-100
            cursor.style.left = `calc(${pos}% - 2px)`;
        }
    }

    // ── Ball Flow (Deprecated - Handled by GameController) ──
    startNextBall() {
        // Obsolete UI manual call, GameController emits 'ballReady' automatically.
    }

    // ── Batting Input (Shot-First Flow) ────────────────────
    bindBattingInput() {
        const shotBtns = document.getElementById('shot-buttons');
        if (!shotBtns) return;

        shotBtns.innerHTML = '';
        SHOT_TYPES.forEach(shot => {
            const btn = document.createElement('button');
            btn.className = 'shot-btn';
            btn.innerHTML = `<span class="shot-name">${shot.name}</span>`;
            btn.dataset.shotId = shot.id;
            btn.addEventListener('click', () => this.selectShot(shot));
            shotBtns.appendChild(btn);
            this.renderEmojis(btn);
        });

        // Remove old key handler
        if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);

        // Keyboard input: 1-8 selects shot, Space executes
        this._keyHandler = (e) => {
            if (this.animating) return;

            // Number keys = select shot
            const shot = SHOT_TYPES.find(s => s.key === e.key);
            if (shot && !this.batting.timingBarActive) {
                this.selectShot(shot);
                return;
            }

            // Space = execute shot (lock in timing)
            if (e.code === 'Space' && this.batting.timingBarActive && this.selectedShotForBall) {
                e.preventDefault();
                this.playShot(this.selectedShotForBall.id);
            }
        };
        document.addEventListener('keydown', this._keyHandler);

        // Wire up Play Shot button
        const playShotBtn = document.getElementById('btn-play-shot');
        if (playShotBtn) {
            const newBtn = playShotBtn.cloneNode(true);
            playShotBtn.parentNode.replaceChild(newBtn, playShotBtn);
            newBtn.addEventListener('click', () => {
                if (this.batting.timingBarActive && this.selectedShotForBall) {
                    this.playShot(this.selectedShotForBall.id);
                }
            });
        }
    }

    // ── Select shot (Step 1: Choose, Step 2: Time) ─────────
    selectShot(shot) {
        if (this.animating) return;

        // If timing bar is already running (player re-selecting), stop it first
        if (this.batting.timingBarActive) {
            this.batting.timingBarActive = false;
        }

        this.selectedShotForBall = shot;

        // Highlight selected button
        document.querySelectorAll('.shot-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.shotId === shot.id);
        });

        // Start timing bar with DYNAMIC zones for this shot
        this.batting.startTimingSequence(this.currentDeliveryResult, shot);
        this.showTimingBar();

        // Update the HTML zone widths to match the shot's zones
        this.updateTimingBarZones();

        // Update label to show shot name
        const label = document.querySelector('.timing-bar-label');
        if (label) label.textContent = `TIME YOUR ${shot.name.toUpperCase()}!`;
        const hint = document.querySelector('.timing-bar-hint');
        if (hint) hint.innerHTML = 'Press SPACE or click <span class="black-emoji">&#9889;</span> PLAY SHOT to execute';
    }

    // ── Update HTML timing bar zone widths ──────────────────
    updateTimingBarZones() {
        const zones = this.batting.timingZones;
        if (!zones) return;
        const total = zones.total;
        const earlyPct = (zones.early / total * 100).toFixed(1);
        const perfectPct = (zones.perfect / total * 100).toFixed(1);
        const latePct = (zones.late / total * 100).toFixed(1);

        const earlyEl = document.querySelector('.timing-zone-early');
        const perfectEl = document.querySelector('.timing-zone-perfect');
        const lateEl = document.querySelector('.timing-zone-late');
        if (earlyEl)   earlyEl.style.flex = `0 0 ${earlyPct}%`;
        if (perfectEl) perfectEl.style.flex = `0 0 ${perfectPct}%`;
        if (lateEl)    lateEl.style.flex = `0 0 ${latePct}%`;
    }

    playShot(shotId) {
        if (this.animating || !this.batting.timingBarActive) return;
        this.animating = true;
        this.hideTimingBar();

        this.lastPlayedShot = SHOT_TYPES.find(s => s.id === shotId) || this.lastPlayedShot;
        const aimAngle = Math.random() * 360; 
        
        // Delegate executing shot, resolving AI bowling, and animating bounds to GameController
        this.gameController.handlePlayerShot(shotId, aimAngle, this.batting.timingBarPosition);
    }

    // ── Bowling Input ──────────────────────────────────────
    bindBowlingInput() {
        const deliveryBtns = document.getElementById('delivery-buttons');
        if (!deliveryBtns) return;

        const deliveries = this.bowling.getAvailableDeliveries();
        deliveryBtns.innerHTML = '';

        deliveries.forEach(d => {
            const btn = document.createElement('button');
            btn.className = 'delivery-btn';
            btn.dataset.deliveryId = d.id;
            btn.innerHTML = `<span class="del-name">${d.name}</span>`;
            btn.addEventListener('click', () => this.selectAndBowl(d.id));
            deliveryBtns.appendChild(btn);
            this.renderEmojis(btn);
        });
    }

    selectAndBowl(deliveryId) {
        if (this.animating) return;

        // If timing bar is active (user switching delivery mid-way)
        if (this.currentExecHandler) {
            document.removeEventListener('keydown', this.currentExecHandler);
            document.getElementById('btn-bowl-action')?.removeEventListener('click', this.currentExecHandler);
            this.currentExecHandler = null;
        }

        this.bowling.selectDelivery(deliveryId);

        // Highlight selected button
        document.querySelectorAll('.delivery-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.deliveryId === deliveryId);
        });

        // AI aim position
        const aim = this.bowling.getAIAimForDelivery(this.bowling.selectedDelivery, this.engine.difficulty);
        this.bowling.setAim(aim.x, aim.y);

        // Start execution meter
        this.bowling.startExecution();
        this.showExecutionMeter();

        // Bind execution press
        this.currentExecHandler = (e) => {
            // Only trigger on spacebar if it's a keydown event
            if (e && e.type === 'keydown' && e.code !== 'Space') return;
            
            if (!this.bowling.executionMeterActive) return;
            document.removeEventListener('keydown', this.currentExecHandler);
            document.getElementById('btn-bowl-action')?.removeEventListener('click', this.currentExecHandler);
            this.currentExecHandler = null;

            this.hideExecutionMeter();
            this.executeBowl();
        };

        document.addEventListener('keydown', this.currentExecHandler);
        document.getElementById('btn-bowl-action')?.addEventListener('click', this.currentExecHandler);
    }

    executeBowl() {
        if (this.animating) return;
        this.animating = true;
        this.hideExecutionMeter();

        if (this.bowling.selectedDelivery) {
            this.lastBowledDeliveryId = this.bowling.selectedDelivery.id;
        }

        this.gameController.handlePlayerDelivery(
            this.bowling.selectedDelivery.id,
            this.bowling.aimX,
            this.bowling.aimY,
            this.bowling.executionPosition
        );
    }

    // ── UI Updates ─────────────────────────────────────────
    updateScoreboard() {
        if (!this.engine || !this.engine.state) return;
        const s = this.engine.state;
        const overs = `${Math.floor(s.balls / 6)}.${s.balls % 6}`;

        this.setText('score-runs', s.runs);
        this.setText('score-wickets', s.wickets);
        this.setText('score-overs', overs);
        this.setText('score-rr', this.engine.getRunRate());

        if (this.engine.innings === 2 && this.engine.target) {
            const runsNeeded = Math.max(0, this.engine.target - s.runs);
            const ballsLeft = Math.max(0, (this.engine.totalOvers * 6) - s.balls);
            this.setText('target-info', `Target: ${this.engine.target} | Need: ${runsNeeded} off ${ballsLeft} balls | RRR: ${this.engine.getRequiredRunRate()}`);
            document.getElementById('target-info')?.classList.remove('hidden');
        } else {
            document.getElementById('target-info')?.classList.add('hidden');
        }

        // Innings label
        this.setText('innings-label', `${this.engine.innings === 1 ? '1st' : '2nd'} Innings`);

        // Last 6 balls
        const lastBalls = document.getElementById('last-balls');
        if (lastBalls) {
            lastBalls.innerHTML = s.lastSixBalls.map(r => {
                const cls = r === 6 ? 'ball-six' : r === 4 ? 'ball-four' : r === 0 ? 'ball-dot' : 'ball-run';
                return `<span class="ball-indicator ${cls}">${r}</span>`;
            }).join('');
        }

        // Pressure meter
        const pressure = this.engine.calculatePressure();
        const pressureBar = document.getElementById('pressure-bar');
        if (pressureBar) {
            pressureBar.style.width = `${pressure * 100}%`;
            pressureBar.style.backgroundColor = pressure > 0.7 ? '#ff4444' : pressure > 0.4 ? '#ffa500' : '#4aff4a';
        }
    }

    updatePlayerInfo() {
        const batter = this.engine.getCurrentBatter();
        const bowler = this.engine.getCurrentBowler();
        
        if (!batter || !bowler) return;

        const bs = this.engine.getBatterStats(batter.id);
        const bws = this.engine.getBowlerStats(bowler.id);
        
        if (!bs || !bws) return;

        this.setText('batter-name', batter.name);
        this.setText('batter-stats', `${bs.runs} (${bs.balls})  SR: ${bs.strikeRate}  4s: ${bs.fours}  6s: ${bs.sixes}`);

        const nonStriker = this.engine.getNonStriker();
        if (nonStriker) {
            const ns = this.engine.getBatterStats(nonStriker.id);
            if (ns) {
                this.setText('nonstriker-name', nonStriker.name);
                this.setText('nonstriker-stats', `${ns.runs} (${ns.balls})`);
            }
        }

        this.setText('bowler-name', bowler.name);
        const bowlerOvers = `${Math.floor(bws.balls / 6)}.${bws.balls % 6}`;
        this.setText('bowler-stats', `${bws.wickets}-${bws.runs} (${bowlerOvers})  Econ: ${bws.economy}`);

        // Signature ability indicator
        const context = this.engine.getMatchContext();
        const abilityEl = document.getElementById('ability-status');
        if (abilityEl) {
            if (batter.signature && batter.signature.condition(context)) {
                abilityEl.innerHTML = `<span class="black-emoji">&#9889;</span> ${batter.signature.name}`;
                abilityEl.classList.add('active');
            } else {
                abilityEl.textContent = batter.signature ? batter.signature.name : '';
                abilityEl.classList.remove('active');
            }
        }
    }

    addCommentary(text, type = 'normal') {
        const feed = document.getElementById('commentary-feed');
        if (!feed) return;

        const entry = document.createElement('div');
        entry.className = `comm-entry comm-${type}`;
        entry.innerHTML = this.wrapEmojis(text);
        this.renderEmojis(entry);

        feed.insertBefore(entry, feed.firstChild);
        if (feed.children.length > 20) feed.removeChild(feed.lastChild);

        entry.style.opacity = '0';
        entry.style.transform = 'translateY(-10px)';
        requestAnimationFrame(() => {
            entry.style.transition = 'all 0.3s ease';
            entry.style.opacity = '1';
            entry.style.transform = 'translateY(0)';
        });
    }

    showBattingControls() {
        document.getElementById('batting-controls')?.classList.remove('hidden');
        document.getElementById('bowling-controls')?.classList.add('hidden');
        document.getElementById('delivery-info')?.classList.remove('hidden');
        this.hideExecutionMeter();
    }

    showBowlingControls() {
        document.getElementById('bowling-controls')?.classList.remove('hidden');
        document.getElementById('batting-controls')?.classList.add('hidden');
        document.getElementById('delivery-info')?.classList.add('hidden');
        this.hideTimingBar();
    }

    showExecutionMeter() {
        const el = document.getElementById('bowling-speed-overlay');
        if (el) el.classList.remove('hidden');
    }

    hideExecutionMeter() {
        const el = document.getElementById('bowling-speed-overlay');
        if (el) el.classList.add('hidden');
    }

    showDeliveryInfo(delivery) {
        this.setText('delivery-info', delivery.description);
    }

    showTimingResult(timing) {
        const el = document.getElementById('timing-result');
        if (el) {
            el.textContent = timing.toUpperCase();
            el.className = `timing-result timing-${timing}`;
            el.style.opacity = '1';
            setTimeout(() => { el.style.opacity = '0'; }, 1000);
        }
    }

    setText(id, text) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = this.wrapEmojis(text);
            this.renderEmojis(el);
        }
    }

    wrapEmojis(text) {
        if (text === null || text === undefined) return '';
        const str = String(text);
        const emojiRegex = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;
        const emoticonRegex = /(:-\)|:\)|:-\(|:\(|;-\)|;\)|:D|:-D|:P|:-P|:\/|:-\/|:\\|:-\\|:O|:-O|:o|:-o|<3)/g;
        return str
            .replace(emojiRegex, '<span class="black-emoji">$1</span>')
            .replace(emoticonRegex, '<span class="black-emoji">$1</span>');
    }

    renderEmojis(target) {
        if (!target || typeof window === 'undefined' || !window.twemoji) return;
        window.twemoji.parse(target, { folder: 'svg', ext: '.svg' });
    }

    // Event Handlers
    onWicket(data) {
        this.addCommentary(`☠️ WICKET! ${data.batter.name} is gone! Score: ${data.score}/${data.wickets}`, 'wicket');
    }

    onOverEnd(data) {
        // Find the bowler object (since data.bowler is just the name)
        const allPlayers = [...this.engine.team1, ...this.engine.team2];
        const bowlerObj = allPlayers.find(p => p.name === data.bowler);
        
        if (bowlerObj) {
            const context = this.engine.getMatchContext();
            context.runsThisOver = data.overRuns; // Inject runs for the over
            const endObj = this.commentary.endOfOverLine(context, bowlerObj);
            if (endObj && endObj.lines) {
                this.addCommentary(endObj.lines.join(' '), 'over');
                return;
            }
        }
        
        // Fallback
        this.addCommentary(`📋 End of over ${data.over}: ${data.bowler} | ${data.overRuns} runs | Score: ${data.score}`, 'over');
    }

    onInningsEnd(data) {
        this.addCommentary(`🏏 End of ${data.innings === 1 ? '1st' : '2nd'} innings: ${data.total}/${data.wickets} (${data.overs})`, 'innings');
        
        if (data.innings === 1) {
            // First innings ended, setting up second innings
            setTimeout(() => {
                this.gamePhase = this.playerRole === 'bat' ? 'bowling' : 'batting';
                this.addCommentary(`🎯 Target: ${this.engine.target}`, 'innings');
                this.updateScoreboard();
                this.updatePlayerInfo();
                this.startNextBall();
            }, 2000);
        }
    }

    onMatchEnd(result) {
        this.stopGameLoop();
        this.gamePhase = 'result';

        // Show result screen
        setTimeout(() => {
            this.showResultScreen(result);
        }, 1500);
    }

    showResultScreen(result) {
        this.showScreen('result-screen');

        this.setText('result-winner', result.winner);
        if (result.isTie || result.winner === 'Tie' || result.winner === 'none') {
            this.setText('result-margin', result.margin || 'Match tied');
        } else {
            this.setText('result-margin', `Won by ${result.margin}`);
        }

        // Build scorecard
        const scorecard = document.getElementById('scorecard');
        if (!scorecard) return;

        let html = '<div class="scorecard-section">';
        html += '<h3>1st Innings</h3>';
        html += `<div class="innings-total">${result.firstInnings.runs}/${result.firstInnings.wickets} (${Math.floor(result.firstInnings.balls / 6)}.${result.firstInnings.balls % 6} ov)</div>`;
        html += this.buildBattingCard(result.firstInnings.batsmenStats);
        html += this.buildBowlingCard(result.firstInnings.bowlerStats);
        html += '</div>';

        html += '<div class="scorecard-section">';
        html += '<h3>2nd Innings</h3>';
        html += `<div class="innings-total">${result.secondInnings.runs}/${result.secondInnings.wickets} (${Math.floor(result.secondInnings.balls / 6)}.${result.secondInnings.balls % 6} ov)</div>`;
        html += this.buildBattingCard(result.secondInnings.batsmenStats);
        html += this.buildBowlingCard(result.secondInnings.bowlerStats);
        html += '</div>';

        scorecard.innerHTML = html;
    }

    buildBattingCard(stats) {
        let html = '<table class="stat-table"><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>';
        Object.entries(stats).forEach(([id, s]) => {
            if (s.balls > 0) {
                const player = getPlayerById(id);
                const name = player ? player.name : id;
                html += `<tr><td>${name}${s.isOut ? ' ✗' : ' *'}</td><td>${s.runs}</td><td>${s.balls}</td><td>${s.fours}</td><td>${s.sixes}</td><td>${s.strikeRate}</td></tr>`;
            }
        });
        html += '</table>';
        return html;
    }

    buildBowlingCard(stats) {
        let html = '<table class="stat-table"><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr>';
        Object.entries(stats).forEach(([id, s]) => {
            if (s.balls > 0) {
                const player = getPlayerById(id);
                const name = player ? player.name : id;
                const overs = `${Math.floor(s.balls / 6)}.${s.balls % 6}`;
                html += `<tr><td>${name}</td><td>${overs}</td><td>${s.runs}</td><td>${s.wickets}</td><td>${s.economy}</td></tr>`;
            }
        });
        html += '</table>';
        return html;
    }
}

// ── Boot ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CricketLegendsApp();
    window.app.init();
});
