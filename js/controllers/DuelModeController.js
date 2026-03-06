// ============================================================
// CRICKET LEGENDS — Duel Mode Controller
// ============================================================

class DuelModeController {
    constructor(gameController, engine) {
        this.gc = gameController;
        this.engine = engine;
        
        this.config = null;
        this.currentPlayer = 1; // 1 or 2
        this.player1Score = { runs: 0, balls: 0, out: false };
        this.player2Score = { runs: 0, balls: 0, out: false };
        this.target = null;
        this.firstInningsState = null;
        this.secondInningsState = null;
        this.player1Batter = null;
        this.player2Batter = null;
    }

    start(config) {
        this.config = config;
        this.currentPlayer = 1;
        this.player1Score = { runs: 0, balls: 0, out: false };
        this.player2Score = { runs: 0, balls: 0, out: false };
        this.target = null;
        this.firstInningsState = null;
        this.secondInningsState = null;
        this.player1Batter = getPlayerById(config.player1BatterId) || getPlayerById('tendulkar');
        this.player2Batter = getPlayerById(config.player2BatterId) || getPlayerById('kohli');

        this.startTurn(1);
    }

    startTurn(playerNum) {
        this.currentPlayer = playerNum;
        
        const batterId = playerNum === 1 ? this.config.player1BatterId : this.config.player2BatterId;
        const bowlerId = this.config.bowlerId || 'akram'; // fallback bowler

        const batter = getPlayerById(batterId) || getPlayerById('tendulkar');
        const bowler = getPlayerById(bowlerId) || getPlayerById('akram');

        // Configure engine for a single-batter duel setup
        this.engine.resetForDuel(batter, bowler, this.config.ballsPerPlayer);
        this.engine.innings = playerNum === 1 ? 1 : 2;
        this.engine.target = playerNum === 2 ? this.target : null;

        this.gc.emit('turnStart', {
            playerNum,
            batter,
            bowler,
            target: this.target,
            balls: this.config.ballsPerPlayer
        });
        
        // Let game controller know human is batting (no human bowling in duel)
        this.gc.setPhase('batting_human');
        
        // Start the first ball of the turn
        setTimeout(() => {
            this.gc.prepareNextBall();
        }, 1000); // Small 1-second delay so UI transitions properly
    }

    onBallComplete(outcome) {
        const score = this.currentPlayer === 1 ? this.player1Score : this.player2Score;
        const state = this.engine.state;

        score.runs = state.runs;
        score.balls = state.balls;
        score.out = state.wickets >= 1;

        const chaseComplete = this.currentPlayer === 2 && this.target && state.runs >= this.target;
        const turnOver = score.out || score.balls >= this.config.ballsPerPlayer || chaseComplete;

        if (turnOver) {
            this.handleTurnEnd();
        } else {
            // Wait a moment then next ball
            setTimeout(() => {
                this.gc.prepareNextBall();
            }, 2500);
        }
    }

    handleTurnEnd() {
        const inningsState = this.cloneInningsState(this.engine.state);
        if (this.currentPlayer === 1) {
            this.firstInningsState = inningsState;
        } else {
            this.secondInningsState = inningsState;
        }

        this.gc.emit('turnEnd', { 
            playerNum: this.currentPlayer, 
            score: this.currentPlayer === 1 ? this.player1Score : this.player2Score,
            target: this.target
        });

        if (this.currentPlayer === 1) {
            this.target = this.player1Score.runs + 1;
            this.gc.emit('duelTargetSet', {
                target: this.target,
                player1Runs: this.player1Score.runs
            });

            setTimeout(() => {
                this.startTurn(2);
            }, 4000);
        } else {
            this.endDuel();
        }
    }

    endDuel() {
        const p1Runs = this.player1Score.runs;
        const p2Runs = this.player2Score.runs;
        let winner, margin, isTie = false;
        let method = '';
        let winnerLabel = '';
        const chaseComplete = !!(this.target && p2Runs >= this.target);

        if (chaseComplete) {
            winner = 'player2';
            winnerLabel = 'Player 2';
            method = 'chase';
            const ballsLeft = Math.max(0, this.config.ballsPerPlayer - this.player2Score.balls);
            margin = ballsLeft === 1 ? '1 ball remaining' : `${ballsLeft} balls remaining`;
        } else if (p1Runs > p2Runs) {
            winner = 'player1';
            winnerLabel = 'Player 1';
            method = 'defend';
            const runMargin = Math.max(1, (this.target || (p1Runs + 1)) - p2Runs);
            margin = `${runMargin} run${runMargin === 1 ? '' : 's'}`;
        } else if (p2Runs > p1Runs) {
            winner = 'player2';
            winnerLabel = 'Player 2';
            method = 'runs';
            margin = `${p2Runs - p1Runs} runs`;
        } else {
            winner = 'none';
            winnerLabel = 'Tie';
            isTie = true;
            margin = 'Tie';
            method = 'tie';
        }

        if (!this.firstInningsState) {
            this.firstInningsState = this.buildFallbackInnings(this.player1Batter, this.player1Score);
        }
        if (!this.secondInningsState) {
            this.secondInningsState = this.buildFallbackInnings(this.player2Batter, this.player2Score);
        }

        const result = {
            mode: 'duel',
            player1Score: this.player1Score,
            player2Score: this.player2Score,
            target: this.target,
            winner,
            winnerLabel,
            margin,
            method,
            isTie
        };

        // Keep compatible with result screen expecting innings payloads.
        result.firstInnings = this.firstInningsState;
        result.secondInnings = this.secondInningsState;
        result.winner = winnerLabel;

        this.gc.emit('duelEnd', result);
    }

    cloneInningsState(state) {
        const copy = JSON.parse(JSON.stringify(state || {}));
        copy.runs = state?.runs || 0;
        copy.wickets = state?.wickets || 0;
        copy.balls = state?.balls || 0;
        copy.batsmenStats = copy.batsmenStats || {};
        copy.bowlerStats = copy.bowlerStats || {};
        return copy;
    }

    buildFallbackInnings(batter, score) {
        const runs = score?.runs || 0;
        const balls = score?.balls || 0;
        const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
        const batterId = batter?.id || 'unknown_batter';
        const bowlerId = this.config?.bowlerId || 'akram';

        return {
            runs,
            wickets: score?.out ? 1 : 0,
            balls,
            batsmenStats: {
                [batterId]: {
                    runs,
                    balls,
                    fours: 0,
                    sixes: 0,
                    strikeRate,
                    isOut: !!score?.out
                }
            },
            bowlerStats: {
                [bowlerId]: {
                    balls,
                    runs,
                    wickets: score?.out ? 1 : 0,
                    economy: balls > 0 ? (runs / (balls / 6)).toFixed(1) : '0.0'
                }
            }
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DuelModeController };
}
