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
        this._responsiveTick = null;
        this.lastTimingLockPosition = null;
        this.lastTimingZones = null;
        this.team1BattingOrder = [];
        this.team1BowlingRotation = [];
        this.customTeamPlayers = [];
        this.isCustomTeamPicking = false;
        this.currentCategory = 'all';
        this.currentSubcategory = 'all';
        // this.debugMode = true;
        this.debugMode = false;
        this.debugLogBuffer = [];
        this.lastTacticalThoughtAt = 0;
        this.lastUrgentTacticalThoughtAt = 0;
        this.pendingAutoShotId = null;
        this.pendingAutoDeliveryId = null;
        this.pendingControlsRetryTimer = null;
    }

    // ── Initialize ─────────────────────────────────────────
    init() {
        this.bindMenuEvents();
        this.bindResponsiveUI();
        this.showScreen('menu-screen');
        this.populateTeamSelectors();
        this.renderEmojis(document.body);
        this.syncResponsiveUI();
        this.resetDebugOverlay();
    }

    // ── Screen Management ──────────────────────────────────
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(id);
        if (screen) screen.classList.add('active');
        this.syncResponsiveUI();
    }

    bindResponsiveUI() {
        const infoToggleBtn = document.getElementById('btn-toggle-info');
        const commToggleBtn = document.getElementById('btn-toggle-commentary');
        const closeInfoBtn = document.getElementById('btn-close-info');
        const closeCommBtn = document.getElementById('btn-close-commentary');

        infoToggleBtn?.addEventListener('click', () => this.toggleMobilePanel('info'));
        commToggleBtn?.addEventListener('click', () => this.toggleMobilePanel('commentary'));
        closeInfoBtn?.addEventListener('click', () => this.closeMobilePanels());
        closeCommBtn?.addEventListener('click', () => this.closeMobilePanels());

        const scheduleSync = () => {
            if (this._responsiveTick) return;
            this._responsiveTick = requestAnimationFrame(() => {
                this._responsiveTick = null;
                this.syncResponsiveUI();
            });
        };

        window.addEventListener('resize', scheduleSync, { passive: true });
        window.addEventListener('orientationchange', scheduleSync, { passive: true });
    }

    toggleMobilePanel(panel) {
        const layout = document.querySelector('#game-screen .game-layout');
        if (!layout || !this.isMobileLayout()) return;

        const showInfo = layout.classList.contains('show-info-panel');
        const showCommentary = layout.classList.contains('show-commentary-panel');

        if (panel === 'info') {
            layout.classList.toggle('show-info-panel', !showInfo);
            layout.classList.toggle('show-commentary-panel', false);
            return;
        }

        if (panel === 'commentary') {
            layout.classList.toggle('show-commentary-panel', !showCommentary);
            layout.classList.toggle('show-info-panel', false);
        }
    }

    closeMobilePanels() {
        const layout = document.querySelector('#game-screen .game-layout');
        if (!layout) return;
        layout.classList.remove('show-info-panel', 'show-commentary-panel');
    }

    syncResponsiveUI() {
        const layout = document.querySelector('#game-screen .game-layout');
        if (!layout) return;

        if (!this.isMobileLayout()) {
            this.closeMobilePanels();
        }
    }

    isMobileLayout() {
        return window.matchMedia('(max-width: 1024px)').matches;
    }

    resetDebugOverlay() {
        this.debugLogBuffer = [];
        const stateEl = document.getElementById('debug-state');
        const logEl = document.getElementById('debug-log');
        const panel = document.getElementById('debug-overlay');
        if (panel) panel.classList.toggle('hidden', !this.debugMode);
        if (stateEl) stateEl.textContent = 'state: waiting for match data...';
        if (logEl) logEl.innerHTML = '';
    }

    getTeamRefName(teamRef) {
        if (!this.engine || !teamRef) return 'unknown';
        if (teamRef === this.engine.team1) return `${this.selectedTeam1} (team1)`;
        if (teamRef === this.engine.team2) return `${this.selectedTeam2} (team2)`;
        return 'non-canonical-team-ref';
    }

    appendDebugLog(eventName, extra = '') {
        if (!this.debugMode) return;
        const now = new Date();
        const ts = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
        const line = `[${ts}] ${eventName}${extra ? ` | ${extra}` : ''}`;
        this.debugLogBuffer.unshift(line);
        if (this.debugLogBuffer.length > 24) this.debugLogBuffer.length = 24;
        const logEl = document.getElementById('debug-log');
        if (logEl) {
            logEl.innerHTML = this.debugLogBuffer.map((l) => `<div class="debug-line">${l}</div>`).join('');
        }
    }

    updateDebugState(reason = 'tick') {
        if (!this.debugMode) return;
        const panel = document.getElementById('debug-overlay');
        const stateEl = document.getElementById('debug-state');
        if (!panel || !stateEl) return;
        panel.classList.remove('hidden');

        if (!this.engine || !this.gameController) {
            stateEl.textContent = `reason=${reason}\nengine/gameController not ready`;
            return;
        }

        const modeState = this.gameController.getGameState ? this.gameController.getGameState() : {};
        const humanRole = modeState?.humanRole || '-';
        const phase = modeState?.phase || this.gamePhase || '-';
        const innings = this.engine.innings;
        const batTeamName = this.getTeamRefName(this.engine.battingTeam);
        const bowlTeamName = this.getTeamRefName(this.engine.bowlingTeam);
        const battingVisible = !document.getElementById('batting-controls')?.classList.contains('hidden');
        const bowlingVisible = !document.getElementById('bowling-controls')?.classList.contains('hidden');
        const target = this.engine.target ?? '-';
        const score = `${this.engine.state?.runs ?? 0}/${this.engine.state?.wickets ?? 0}`;

        stateEl.textContent = [
            `reason=${reason}`,
            `mode=${modeState?.mode || this.gameMode} | innings=${innings} | phase=${phase} | humanRole=${humanRole}`,
            `battingTeam=${batTeamName}`,
            `bowlingTeam=${bowlTeamName}`,
            `controls: battingVisible=${battingVisible} bowlingVisible=${bowlingVisible}`,
            `score=${score} | target=${target}`
        ].join('\n');
    }

    // ── Menu Events ────────────────────────────────────────
    bindMenuEvents() {
        document.getElementById('btn-quick-match')?.addEventListener('click', () => {
            this.gameMode = 'quick';
            this.showScreen('setup-screen');
            this.initializeQuickMatchLineups();
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

        document.getElementById('sel-team1')?.addEventListener('change', (e) => {
            this.selectedTeam1 = e.target.value;
            this.initializeQuickMatchLineups();
        });
        document.getElementById('sel-team2')?.addEventListener('change', (e) => this.selectedTeam2 = e.target.value);
        document.getElementById('sel-overs')?.addEventListener('change', (e) => this.selectedOvers = parseInt(e.target.value));
        document.getElementById('sel-difficulty')?.addEventListener('change', (e) => this.selectedDifficulty = e.target.value);
        document.getElementById('sel-pitch')?.addEventListener('change', (e) => {
            this.selectedPitch = PITCH_TYPES.find(p => p.id === e.target.value) || PITCH_TYPES[0];
        });

        document.getElementById('btn-back-menu')?.addEventListener('click', () => this.showScreen('menu-screen'));
        document.getElementById('btn-play-again')?.addEventListener('click', () => window.location.reload());

        document.getElementById('player-search')?.addEventListener('input', (e) => this.renderRoster(e.target.value));
        document.getElementById('btn-cancel-custom')?.addEventListener('click', () => {
            document.getElementById('custom-team-overlay').classList.add('hidden');
        });
        document.getElementById('btn-confirm-custom')?.addEventListener('click', () => this.confirmCustomTeam());

        this.bindCategoryEvents();
    }

    bindCategoryEvents() {
        const tabs = document.querySelectorAll('.category-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentCategory = tab.dataset.role;
                this.currentSubcategory = 'all';
                this.updateSubcategoryFilters();
                this.renderRoster(document.getElementById('player-search').value);
            });
        });
    }

    updateSubcategoryFilters() {
        const container = document.getElementById('subcategory-filters');
        if (!container) return;
        container.innerHTML = '';

        let subcats = [];
        if (this.currentCategory === 'Batter') {
            subcats = [{ id: 'all', name: 'All Batsmen' }, { id: 'opener', name: 'Openers' }, { id: 'middle', name: 'Middle Order' }];
        } else if (this.currentCategory === 'Bowler') {
            subcats = [{ id: 'all', name: 'All Bowlers' }, { id: 'pace', name: 'Pacers' }, { id: 'spin', name: 'Spinners' }];
        } else if (this.currentCategory === 'All-Rounder') {
            subcats = [{ id: 'all', name: 'All AR' }, { id: 'pace', name: 'Pace AR' }, { id: 'spin', name: 'Spin AR' }];
        }

        if (subcats.length === 0) return;

        subcats.forEach(sub => {
            const btn = document.createElement('button');
            btn.className = `sub-filter ${this.currentSubcategory === sub.id ? 'active' : ''}`;
            btn.textContent = sub.name;
            btn.addEventListener('click', () => {
                container.querySelectorAll('.sub-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentSubcategory = sub.id;
                this.renderRoster(document.getElementById('player-search').value);
            });
            container.appendChild(btn);
        });
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
            
            // Add Custom Team option
            const customOpt = document.createElement('option');
            customOpt.value = 'custom';
            customOpt.textContent = '★ Custom Team (Pick 11)';
            sel.appendChild(customOpt);
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

        this.initializeQuickMatchLineups();
    }

    openPlayerPicker() {
        this.customTeamPlayers = [];
        this.currentCategory = 'all';
        this.currentSubcategory = 'all';
        document.querySelectorAll('.category-tab').forEach(t => t.classList.toggle('active', t.dataset.role === 'all'));
        this.updateSubcategoryFilters();
        
        document.getElementById('custom-team-overlay').classList.remove('hidden');
        document.getElementById('player-search').value = '';
        this.renderRoster();
        this.updatePlayerPickerUI();
    }

    renderRoster(filter = '') {
        const grid = document.getElementById('roster-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const searchTerm = filter.toLowerCase();
        let players = PLAYERS.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            (p.country && p.country.toLowerCase().includes(searchTerm))
        );

        // Category Filter
        if (this.currentCategory !== 'all') {
            players = players.filter(p => p.role === this.currentCategory);
        }

        // Subcategory Filter
        if (this.currentSubcategory !== 'all') {
            if (this.currentCategory === 'Batter') {
                if (this.currentSubcategory === 'opener') players = players.filter(p => p.isOpener);
                else if (this.currentSubcategory === 'middle') players = players.filter(p => !p.isOpener);
            } else if (this.currentCategory === 'Bowler' || this.currentCategory === 'All-Rounder') {
                const isSpin = (style) => style && style.includes('Spin');
                if (this.currentSubcategory === 'spin') players = players.filter(p => isSpin(p.bowlingStyle));
                else if (this.currentSubcategory === 'pace') players = players.filter(p => !isSpin(p.bowlingStyle) && p.bowlingStyle !== 'None');
            }
        }

        players.forEach(player => {
            const isSelected = this.customTeamPlayers.includes(player.id);
            const item = document.createElement('div');
            item.className = `roster-item ${isSelected ? 'selected' : ''}`;
            
            const stats = player.batting ? `
                <div class="roster-player-stats">
                    <span class="roster-stat-badge">BAT: ${player.batting.timing}</span>
                    <span class="roster-stat-badge">BWL: ${player.bowling ? player.bowling.accuracy : '-'}</span>
                </div>
            ` : '';

            item.innerHTML = `
                <div class="roster-player-name">${player.name}</div>
                <div class="roster-player-role">${player.role} | ${player.country}</div>
                ${stats}
            `;

            item.addEventListener('click', () => this.togglePlayerSelection(player.id));
            grid.appendChild(item);
        });
    }

    togglePlayerSelection(playerId) {
        const idx = this.customTeamPlayers.indexOf(playerId);
        if (idx > -1) {
            this.customTeamPlayers.splice(idx, 1);
        } else if (this.customTeamPlayers.length < 11) {
            this.customTeamPlayers.push(playerId);
        }
        this.renderRoster(document.getElementById('player-search').value);
        this.updatePlayerPickerUI();
    }

    updatePlayerPickerUI() {
        const count = this.customTeamPlayers.length;
        const selectedPlayers = this.customTeamPlayers.map(id => getPlayerById(id));
        
        const bowlerCount = selectedPlayers.filter(p => this.isBowlingEligible(p)).length;
        const wkCount = selectedPlayers.filter(p => p.role === PLAYER_ROLES.WICKETKEEPER).length;
        
        if (document.getElementById('custom-player-count')) document.getElementById('custom-player-count').textContent = count;
        if (document.getElementById('custom-player-count-header')) document.getElementById('custom-player-count-header').textContent = count;
        
        const validationHost = document.getElementById('picker-validation-info');
        if (validationHost) {
            validationHost.innerHTML = `
                <div class="validation-item ${count === 11 ? 'valid' : ''}">Players: ${count}/11</div>
                <div class="validation-item ${bowlerCount >= 5 ? 'valid' : ''}">Bowlers: ${bowlerCount}/5+</div>
                <div class="validation-item ${wkCount >= 1 ? 'valid' : ''}">Keeper: ${wkCount}/1+</div>
            `;
        }

        const isValid = count === 11 && bowlerCount >= 5 && wkCount >= 1;
        document.getElementById('btn-confirm-custom').disabled = !isValid;
    }

    confirmCustomTeam() {
        if (this.customTeamPlayers.length !== 11) return;
        document.getElementById('custom-team-overlay').classList.add('hidden');
        
        // Temporarily register custom team
        TEAMS['custom'] = {
            name: 'Custom Team',
            color: '#3b82f6',
            players: [...this.customTeamPlayers]
        };
        
        this.selectedTeam1 = 'custom';
        const sel1 = document.getElementById('sel-team1');
        if (sel1) sel1.value = 'custom';
        
        // Force initial batting order to mirror selection sequence
        this.team1BattingOrder = [...this.customTeamPlayers];
        
        this.initializeQuickMatchLineups();
    }

    isBowlingEligible(player) {
        if (!player) return false;
        if (player.bowlingStyle === BOWLING_STYLE.NONE) return false;
        const roleEligible = player.role === PLAYER_ROLES.BOWLER || player.role === PLAYER_ROLES.ALL_ROUNDER;
        const skillEligible = (player.bowling?.paceOrSpin || 0) >= 30;
        return roleEligible && skillEligible;
    }

    initializeQuickMatchLineups() {
        if (this.selectedTeam1 === 'custom' && this.customTeamPlayers.length === 0) {
            this.openPlayerPicker();
            return;
        }

        const teamPlayers = getTeamPlayers(this.selectedTeam1);
        if (!teamPlayers.length) return;

        const validIds = new Set(teamPlayers.map(p => p.id));

        const keptBatting = (this.team1BattingOrder || []).filter(id => validIds.has(id));
        const missingBatting = teamPlayers.map(p => p.id).filter(id => !keptBatting.includes(id));
        this.team1BattingOrder = [...keptBatting, ...missingBatting];

        const bowlers = teamPlayers.filter(p => this.isBowlingEligible(p));
        const bowlerIds = new Set(bowlers.map(p => p.id));
        const keptBowling = (this.team1BowlingRotation || []).filter(id => bowlerIds.has(id));
        const missingBowling = bowlers.map(p => p.id).filter(id => !keptBowling.includes(id));
        this.team1BowlingRotation = [...keptBowling, ...missingBowling];

        this.renderLineupEditors();
    }

    moveLineupItem(type, index, direction) {
        const list = type === 'batting' ? this.team1BattingOrder : this.team1BowlingRotation;
        const target = index + direction;
        if (!Array.isArray(list) || target < 0 || target >= list.length) return;
        const temp = list[index];
        list[index] = list[target];
        list[target] = temp;
        this.renderLineupEditors();
    }

    renderLineupEditors() {
        const battingHost = document.getElementById('batting-order-list');
        const bowlingHost = document.getElementById('bowling-order-list');
        if (!battingHost || !bowlingHost) return;

        const resolveName = (id) => getPlayerById(id)?.name || id;
        const buildRows = (ids, type) => ids.map((id, idx) => `
            <div class="lineup-row">
                <div class="lineup-meta">
                    <span class="lineup-index">${idx + 1}</span>
                    <span class="lineup-name">${resolveName(id)}</span>
                </div>
                <div class="lineup-actions">
                    <button type="button" class="lineup-move-btn" data-type="${type}" data-dir="-1" data-index="${idx}" ${idx === 0 ? 'disabled' : ''}>Up</button>
                    <button type="button" class="lineup-move-btn" data-type="${type}" data-dir="1" data-index="${idx}" ${idx === ids.length - 1 ? 'disabled' : ''}>Down</button>
                    ${type === 'bowling' ? `<button type="button" class="lineup-drop-btn" data-index="${idx}">Drop</button>` : ''}
                </div>
            </div>
        `).join('');

        battingHost.innerHTML = buildRows(this.team1BattingOrder, 'batting');
        bowlingHost.innerHTML = buildRows(this.team1BowlingRotation, 'bowling');

        const bindMoves = (root) => {
            root.querySelectorAll('.lineup-move-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    const dir = parseInt(btn.dataset.dir, 10) || 0;
                    const index = parseInt(btn.dataset.index, 10) || 0;
                    this.moveLineupItem(type, index, dir);
                });
            });
        };

        bindMoves(battingHost);
        bindMoves(bowlingHost);

        bowlingHost.querySelectorAll('.lineup-drop-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index, 10);
                this.team1BowlingRotation.splice(index, 1);
                this.renderLineupEditors();
            });
        });
    }

    // ── Start Match ────────────────────────────────────────
    startMatch() {
        const feed = document.getElementById('commentary-feed');
        if (feed) feed.innerHTML = '';
        this.resetDebugOverlay();

        // Validate bowling minimum
        if (this.team1BowlingRotation.length < 5) {
            const errorEl = document.getElementById('setup-error');
            if (errorEl) {
                errorEl.textContent = 'At least 5 bowlers are required to start the match!';
                errorEl.classList.remove('hidden');
                setTimeout(() => errorEl.classList.add('hidden'), 4000);
            }
            return;
        }

        this.appendDebugLog('startMatch', `mode=${this.gameMode} team1=${this.selectedTeam1} team2=${this.selectedTeam2}`);

        this.initializeQuickMatchLineups();

        const team1Players = getTeamPlayers(this.selectedTeam1);
        const team2Players = getTeamPlayers(this.selectedTeam2);

        this.engine = new MatchEngine({
            team1: team1Players,
            team2: team2Players,
            totalOvers: this.gameMode === 'superover' ? 1 : this.selectedOvers,
            pitch: this.selectedPitch,
            difficulty: this.selectedDifficulty,
            team1BattingOrder: [...this.team1BattingOrder],
            team1BowlingRotation: [...this.team1BowlingRotation]
        });

        this.batting = new BattingSystem(this.engine);
        this.bowling = new BowlingSystem(this.engine);
        this.commentary = new CommentarySystem();
        this.gameController = new GameController(this.engine, this.batting, this.bowling, this.commentary);
        if (this.gameController?.ai) {
            this.gameController.ai.onTacticalThought = (evt) => {
                const now = Date.now();
                if (evt?.urgent) {
                    if (now - this.lastUrgentTacticalThoughtAt < 6000) return;
                    this.lastUrgentTacticalThoughtAt = now;
                } else if (now - this.lastTacticalThoughtAt < 18000) {
                    return;
                }
                this.lastTacticalThoughtAt = now;
                this.addCommentary(evt?.text || '🧠 Tactical update.', 'over');
            };
        }

        this.renderer = new GameRenderer('game-canvas');
        this.sprites = new SpriteOverlay();

        // Bind GameController events
        this.gameController.on('phaseChange', (data) => {
            this.gamePhase = data.phase;
            if (data.phase === 'batting_human') {
                this.showBattingControls();
            } else if (data.phase === 'bowling_human') {
                this.showBowlingControls();
            }
            this.updatePlayerInfo();
            this.updateScoreboard();
            this.appendDebugLog('phaseChange', `phase=${data.phase}`);
            this.updateDebugState('phaseChange');
        });
        
        this.gameController.on('ballReadyHumanBatting', (data) => {
            this.currentDeliveryResult = data.deliveryResult;
            this.showBattingControls();
            this.showDeliveryInfo(data.deliveryResult);
            this.hideTimingBar();
            this.bindBattingInput();
            
            const availableShots = this.getAvailableShotsForCurrentBatter();
            const autoShot = availableShots.find((s) => s.id === this.lastPlayedShot?.id) ||
                availableShots.find((s) => s.id === 'drive') ||
                availableShots[0];
            if (autoShot) {
                this.pendingAutoShotId = autoShot.id;
                this.tryResolvePendingControls();
            }
            this.appendDebugLog('ballReadyHumanBatting', `delivery=${data.deliveryResult?.delivery?.id || data.deliveryResult?.deliveryType || 'unknown'}`);
            this.updateDebugState('ballReadyHumanBatting');
        });
        
        this.gameController.on('ballReadyHumanBowling', (data) => {
            this.showBowlingControls();
            this.bindBowlingInput();
            
            const autoDelivery = this.lastBowledDeliveryId || this.bowling.getAvailableDeliveries()[0].id;
            if (autoDelivery) {
                this.pendingAutoDeliveryId = autoDelivery;
                this.tryResolvePendingControls();
            }
            this.appendDebugLog('ballReadyHumanBowling', `batter=${data.batter?.name || '-'} bowler=${data.bowler?.name || '-'}`);
            this.updateDebugState('ballReadyHumanBowling');
        });

        this.gameController.on('inningsStart', () => {
            const role = this.gameController?.getGameState?.().humanRole;
            if (role === 'bowl') this.showBowlingControls();
            if (role === 'bat') this.showBattingControls();
            this.updateScoreboard();
            this.updatePlayerInfo();
            this.appendDebugLog('inningsStart', `innings=${this.engine?.innings} role=${role}`);
            this.updateDebugState('inningsStart');
        });

        this.gameController.on('ballComplete', (data) => {
            const outcome = data.outcome;
            // Add ball commentary immediately so it always appears before any over-end entry.
            const typeClass = outcome.wicket ? 'wicket' : outcome.six ? 'six' : outcome.boundary ? 'four' : 'normal';
            if (Array.isArray(data.commentary)) {
                data.commentary.forEach(obj => this.addCommentary(obj.text, `${typeClass} speaker-${obj.speaker} energy-${obj.energy}`));
            } else {
                this.addCommentary(data.commentary, typeClass);
            }
            this.renderer.animateBall(outcome, () => {
                if (outcome.wicket) this.renderer.wicketEffect();
                if (outcome.six) this.renderer.boundaryEffect(true);
                else if (outcome.boundary) this.renderer.boundaryEffect(false);

                const spriteDuration = outcome.wicket ? 2200 : outcome.six ? 2000 : outcome.boundary ? 1600 : 1000;
                this.sprites.show(outcome, spriteDuration);

                this.updateScoreboard();
                this.updatePlayerInfo();
                this.showTimingResult(outcome.timingDetail || outcome.timing, outcome.timingPosition, outcome.timingZones);

                setTimeout(() => {
                    this.animating = false;
                    this.tryResolvePendingControls();
                }, spriteDuration);
            });
            this.appendDebugLog('ballComplete', `runs=${outcome?.runs} wicket=${!!outcome?.wicket}`);
            this.updateDebugState('ballComplete');
        });

        this.gameController.on('matchEnd', (data) => this.onMatchEnd(data));
        this.gameController.on('duelEnd', (data) => this.onMatchEnd(data));
        this.engine.on('wicket', (data) => this.onWicket(data));
        this.engine.on('overEnd', (data) => this.onOverEnd(data));
        this.engine.on('inningsEnd', (data) => this.onInningsEnd(data));
        this.engine.on('overEnd', () => this.updateDebugState('engine.overEnd'));
        this.engine.on('inningsEnd', () => this.updateDebugState('engine.inningsEnd'));
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
        this.updateDebugState('postStartMatch');
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
        const availableShots = this.getAvailableShotsForCurrentBatter();
        availableShots.forEach(shot => {
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
            const shot = this.getAvailableShotsForCurrentBatter().find(s => s.key === e.key);
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
        this.lastPlayedShot = shot;

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
        const zoneKeys = [
            { key: 'veryEarly', cls: '.timing-zone-very-early' },
            { key: 'early', cls: '.timing-zone-early' },
            { key: 'good', cls: '.timing-zone-good' },
            { key: 'perfect', cls: '.timing-zone-perfect' },
            { key: 'late', cls: '.timing-zone-late' },
            { key: 'veryLate', cls: '.timing-zone-very-late' }
        ];

        zoneKeys.forEach(({ key, cls }) => {
            const el = document.querySelector(cls);
            if (!el) return;
            const width = Math.max(0, zones[key] || 0);
            const pct = ((width / total) * 100).toFixed(2);
            el.style.flex = `0 0 ${pct}%`;
        });
    }

    playShot(shotId) {
        if (this.animating || !this.batting.timingBarActive) return;
        const availableShots = this.getAvailableShotsForCurrentBatter();
        const selected = availableShots.find((s) => s.id === shotId);
        if (!selected) return;
        this.lastTimingLockPosition = this.batting.timingBarPosition;
        this.lastTimingZones = this.batting.timingZones;
        this.animating = true;
        this.hideTimingBar();

        this.lastPlayedShot = selected;
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
        this.lastBowledDeliveryId = deliveryId;

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

    autoSelectShotWhenReady(shot, retries = 20) {
        const availableShots = this.getAvailableShotsForCurrentBatter();
        const targetShot = (shot && shot.id)
            ? availableShots.find((s) => s.id === shot.id)
            : availableShots.find((s) => s.id === shot) || availableShots.find((s) => s.id === this.lastPlayedShot?.id) || availableShots.find((s) => s.id === 'drive') || availableShots[0];
        if (!targetShot) return;
        if (!this.animating) {
            this.selectShot(targetShot);
            return;
        }
        if (retries <= 0) return;
        setTimeout(() => this.autoSelectShotWhenReady(targetShot, retries - 1), 80);
    }

    autoSelectDeliveryWhenReady(deliveryId, retries = 20) {
        const deliveries = this.bowling?.getAvailableDeliveries?.() || [];
        const resolvedId = deliveryId || this.lastBowledDeliveryId || deliveries[0]?.id;
        if (!resolvedId) return;
        if (!this.animating) {
            this.selectAndBowl(resolvedId);
            return;
        }
        if (retries <= 0) return;
        setTimeout(() => this.autoSelectDeliveryWhenReady(resolvedId, retries - 1), 80);
    }

    tryResolvePendingControls() {
        if (this.animating) {
            this.schedulePendingControlsRetry();
            return;
        }

        if (this.gamePhase === 'batting_human' && this.pendingAutoShotId) {
            const shotId = this.pendingAutoShotId;
            this.autoSelectShotWhenReady(shotId, 9999);
            if (!this.batting?.timingBarActive) {
                this.schedulePendingControlsRetry();
            } else {
                this.pendingAutoShotId = null;
                this.clearPendingControlsRetry();
            }
            return;
        }

        if (this.gamePhase === 'bowling_human' && this.pendingAutoDeliveryId) {
            const deliveryId = this.pendingAutoDeliveryId;
            this.autoSelectDeliveryWhenReady(deliveryId, 9999);
            if (!this.bowling?.executionMeterActive) {
                this.schedulePendingControlsRetry();
            } else {
                this.pendingAutoDeliveryId = null;
                this.clearPendingControlsRetry();
            }
            return;
        }

        this.clearPendingControlsRetry();
    }

    schedulePendingControlsRetry() {
        if (this.pendingControlsRetryTimer) return;
        this.pendingControlsRetryTimer = setTimeout(() => {
            this.pendingControlsRetryTimer = null;
            this.tryResolvePendingControls();
        }, 120);
    }

    clearPendingControlsRetry() {
        if (!this.pendingControlsRetryTimer) return;
        clearTimeout(this.pendingControlsRetryTimer);
        this.pendingControlsRetryTimer = null;
    }

    getAvailableShotsForCurrentBatter() {
        const batter = this.engine?.getCurrentBatter?.();
        if (typeof getShotsForBatter === 'function') {
            const shots = getShotsForBatter(batter);
            if (Array.isArray(shots) && shots.length > 0) return shots;
        }
        return SHOT_TYPES.filter((s) => ['defensive', 'drive', 'lofted'].includes(s.id));
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

    addCommentary(text, type = 'normal', options = {}) {
        const feed = document.getElementById('commentary-feed');
        if (!feed) return;

        const entry = document.createElement('div');
        entry.className = `comm-entry comm-${type}`;
        entry.innerHTML = this.wrapEmojis(text);
        this.renderEmojis(entry);

        if (options.insertAfterFirst && feed.firstChild) {
            feed.insertBefore(entry, feed.firstChild.nextSibling);
        } else {
            feed.insertBefore(entry, feed.firstChild);
        }
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
        this.closeMobilePanels();
        document.getElementById('batting-controls')?.classList.remove('hidden');
        document.getElementById('bowling-controls')?.classList.add('hidden');
        document.getElementById('delivery-info')?.classList.remove('hidden');
        this.hideExecutionMeter();
        this.updateDebugState('showBattingControls');
    }

    showBowlingControls() {
        this.closeMobilePanels();
        document.getElementById('bowling-controls')?.classList.remove('hidden');
        document.getElementById('batting-controls')?.classList.add('hidden');
        document.getElementById('delivery-info')?.classList.add('hidden');
        this.hideTimingBar();
        this.updateDebugState('showBowlingControls');
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

    showTimingResult(timing, lockedPosition = null, lockedZones = null) {
        const el = document.getElementById('timing-result');
        if (el) el.style.opacity = '0';
        this.showTimingLandingFeedback(timing, lockedPosition, lockedZones);
    }

    showTimingLandingFeedback(timing, lockedPosition = null, lockedZones = null) {
        const box = document.getElementById('timing-landing-feedback');
        const marker = document.getElementById('timing-landing-marker');
        const text = document.getElementById('timing-landing-text');
        if (!box || !marker || !text) return;

        const position = Math.max(0, Math.min(100,
            lockedPosition !== null && lockedPosition !== undefined
                ? lockedPosition
                : (this.lastTimingLockPosition ?? this.batting?.timingBarPosition ?? 50)
        ));
        marker.style.left = `${position}%`;
        text.textContent = String(timing).replace('_', ' ').toUpperCase();

        const zones = lockedZones || this.lastTimingZones || this.batting?.timingZones;
        if (zones && zones.total) {
            const zoneEls = [
                { key: 'veryEarly', cls: '.timing-landing-zone-very-early' },
                { key: 'early', cls: '.timing-landing-zone-early' },
                { key: 'good', cls: '.timing-landing-zone-good' },
                { key: 'perfect', cls: '.timing-landing-zone-perfect' },
                { key: 'late', cls: '.timing-landing-zone-late' },
                { key: 'veryLate', cls: '.timing-landing-zone-very-late' }
            ];
            zoneEls.forEach(({ key, cls }) => {
                const el = box.querySelector(cls);
                if (!el) return;
                const pct = ((Math.max(0, zones[key] || 0) / zones.total) * 100).toFixed(2);
                el.style.flex = `0 0 ${pct}%`;
            });
        }

        box.className = `timing-landing-feedback show grade-${timing}`;
        box.classList.remove('hidden');
        clearTimeout(this._timingLandingHideT);
        this._timingLandingHideT = setTimeout(() => {
            box.classList.add('hidden');
            box.classList.remove('show', `grade-${timing}`);
        }, 1400);
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
                setTimeout(() => {
                    endObj.lines.forEach(obj => this.addCommentary(obj.text, `over speaker-${obj.speaker} energy-${obj.energy}`));
                }, 0);
                return;
            }
        }
        
        // Fallback
        setTimeout(() => {
            this.addCommentary(`📋 End of over ${data.over}: ${data.bowler} | ${data.overRuns} runs | Score: ${data.score}`, 'over');
        }, 0);
    }

    onInningsEnd(data) {
        setTimeout(() => {
            this.addCommentary(`End of ${data.innings === 1 ? '1st' : '2nd'} innings: ${data.total}/${data.wickets} (${data.overs})`, 'innings');
        }, 0);
        this.appendDebugLog('onInningsEnd', `innings=${data.innings} total=${data.total}/${data.wickets}`);
        this.updateDebugState('onInningsEnd');

        // Mode controllers handle innings transitions and role swap.
        // Keep app-level innings handler commentary-only.
        if (data.innings === 1 && this.engine?.target) {
            this.addCommentary(`Target: ${this.engine.target}`, 'innings');
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
