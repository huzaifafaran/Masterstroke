// ============================================================
// CRICKET LEGENDS — VS AI Mode Controller
// ============================================================

class VsAIModeController {
    constructor(gameController, engine) {
        this.gc = gameController;
        this.engine = engine;
        this.config = null;
        
        this.humanTeamId = null;
        this.humanRole = null; // 'bat' or 'bowl'
        this.humanTeam = null;
        this.aiTeam = null;
        this.humanBatsFirst = null;
    }

    didHumanBatInCurrentInnings() {
        if (this.gc.phase === 'batting_human') return true;
        if (this.gc.phase === 'bowling_human') return false;
        return this.engine.battingTeam === this.humanTeam;
    }

    start(config) {
        this.config = config;
        this.humanTeamId = config.humanTeamId;
        this.humanTeam = this.humanTeamId === 'team1' ? this.engine.team1 : this.engine.team2;
        this.aiTeam = this.humanTeamId === 'team1' ? this.engine.team2 : this.engine.team1;

        this.gc.emit('matchStart', { config });
        this.performToss();
    }

    performToss() {
        // Do not call engine.simulateToss() here, it mutates team order immediately.
        const tossResult = {
            winner: Math.random() > 0.5 ? 'team1' : 'team2',
            choice: null
        };
        this.engine.tossWinner = tossResult.winner;
        const humanWonToss = tossResult.winner === this.humanTeamId;
        
        this.gc.emit('tossComplete', tossResult);

        if (humanWonToss) {
            // Wait for human to decide via UI (UI must call setTossChoice)
            this.gc.setPhase('toss_decision');
        } else {
            // AI decides
            const aiChoice = this.gc.ai.chooseBatOrBowl(this.engine.getMatchContext());
            this.setTossChoice(aiChoice, false);
        }
    }

    setTossChoice(choice, isHumanChoice) {
        // choice: 'bat' or 'bowl'
        this.engine.tossWinner = isHumanChoice ? this.humanTeamId : (this.humanTeamId === 'team1' ? 'team2' : 'team1');
        this.engine.tossChoice = choice;

        if (isHumanChoice) {
            this.humanRole = choice;
        } else {
            this.humanRole = (choice === 'bat') ? 'bowl' : 'bat';
        }
        this.humanBatsFirst = this.humanRole === 'bat';

        // Configure teams deterministically for innings 1.
        this.applyRoleTeams();

        this.gc.emit('tossDecisionFinal', { 
            winner: isHumanChoice ? 'Player' : 'AI',
            choice: choice,
            humanRole: this.humanRole
        });

        setTimeout(() => this.startInnings(), 2000);
    }

    applyRoleTeams() {
        if (this.humanBatsFirst) {
            this.engine.battingTeam = this.humanTeam;
            this.engine.bowlingTeam = this.aiTeam;
        } else {
            this.engine.battingTeam = this.aiTeam;
            this.engine.bowlingTeam = this.humanTeam;
        }
    }

    startInnings() {
        this.engine.startInnings();

        // Resolve role deterministically from toss outcome + innings number.
        // This avoids false positives when both teams share some player IDs.
        if (this.engine.innings === 1) {
            this.humanRole = this.humanBatsFirst ? 'bat' : 'bowl';
        } else {
            this.humanRole = this.humanBatsFirst ? 'bowl' : 'bat';
        }
        const phase = this.humanRole === 'bat' ? 'batting_human' : 'bowling_human';
        this.gc.setPhase(phase);

        this.gc.emit('inningsStart', { 
            innings: this.engine.innings,
            battingTeam: this.engine.battingTeam,
            bowlingTeam: this.engine.bowlingTeam
        });
        
        this.gc.prepareNextBall();
    }

    onBallComplete(outcome) {
        // Wait then trigger next
        const delay = outcome.wicket ? 2500 : outcome.six ? 2200 : outcome.boundary ? 1800 : 1200;
        
        setTimeout(() => {
            if (this.engine.isMatchOver) {
                this.endMatch();
            } else if (this.engine.isInningsOver()) {
                this.handleInningsTransition();
            } else {
                this.gc.prepareNextBall();
            }
        }, delay);
    }

    handleInningsTransition() {
        this.gc.emit('inningsEnd', {
            state: this.engine.state,
            target: this.engine.state.runs + 1
        });

        // Determine innings-1 role from actual live phase, not toss assumptions.
        const humanBattedInningsOne = this.didHumanBatInCurrentInnings();
        this.humanBatsFirst = humanBattedInningsOne;

        this.engine.innings = 2;
        this.engine.target = this.engine.state.runs + 1;

        // Second innings team assignment from toss outcome.
        if (humanBattedInningsOne) {
            this.engine.battingTeam = this.aiTeam;
            this.engine.bowlingTeam = this.humanTeam;
        } else {
            this.engine.battingTeam = this.humanTeam;
            this.engine.bowlingTeam = this.aiTeam;
        }

        // In super-over, switch immediately after over completion.
        const inningsBreakMs = this.engine.totalOvers === 1 ? 600 : 1800;
        setTimeout(() => {
            this.startInnings();
        }, inningsBreakMs);
    }

    endMatch() {
        const result = this.engine.getMatchResult();
        this.gc.emit('matchEnd', {
            ...result,
            mode: 'vs_ai',
            toss: {
                winner: this.engine.tossWinner,
                choice: this.engine.tossChoice
            }
        });
        this.gc.setPhase('matchEnd');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VsAIModeController };
}
