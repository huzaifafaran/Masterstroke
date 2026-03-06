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
    }

    start(config) {
        this.config = config;
        this.humanTeamId = config.humanTeamId;

        this.gc.emit('matchStart', { config });
        this.performToss();
    }

    performToss() {
        const tossResult = this.engine.simulateToss();
        const humanWonToss = tossResult.winner === 'team1';
        
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
        this.engine.tossWinner = isHumanChoice ? 'team1' : 'team2';
        this.engine.tossChoice = choice;

        if (isHumanChoice) {
            this.humanRole = choice;
        } else {
            this.humanRole = (choice === 'bat') ? 'bowl' : 'bat';
        }

        // Configure engine innings 1
        if (this.humanRole === 'bowl') {
            this.engine.swapTeams();
        }

        this.gc.emit('tossDecisionFinal', { 
            winner: isHumanChoice ? 'Player' : 'AI',
            choice: choice,
            humanRole: this.humanRole
        });

        setTimeout(() => this.startInnings(), 2000);
    }

    startInnings() {
        this.engine.startInnings();
        
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

        this.engine.innings = 2;
        this.engine.target = this.engine.state.runs + 1;
        
        // Swap teams
        this.engine.swapTeams();
        this.humanRole = (this.humanRole === 'bat') ? 'bowl' : 'bat';

        setTimeout(() => {
            this.startInnings();
        }, 5000); // 5 sec innings break
    }

    endMatch() {
        const result = this.engine.getMatchResult();
        this.gc.emit('matchEnd', {
            mode: 'vs_ai',
            toss: {
                winner: this.engine.tossWinner,
                choice: this.engine.tossChoice
            },
            winner: result.winner,
            margin: result.margin,
            method: result.method
        });
        this.gc.setPhase('matchEnd');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VsAIModeController };
}
