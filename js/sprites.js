// ============================================================
// CRICKET LEGENDS — Sprite Overlay Animation System
// ============================================================
// Displays sprite sheet frames as animated overlays on ball outcomes
// Sprite sheet: image.png (1200×896, 4 cols × 3 rows, 300×299 per cell)
// ============================================================

class SpriteOverlay {
    constructor() {
        this.sheetSrc = 'image.png';
        this.cols = 4;
        this.rows = 3;
        this.cellW = 300;
        this.cellH = 299;  // 896 / 3 ≈ 299

        // Map each grid position to an outcome type
        // Row 0: SIX, FOUR, RUNNING, DOT
        // Row 1: BOWLED, CAUGHT, LBW, RUN_OUT
        // Row 2: BOWLING, WIDE, NO_BALL, CELEBRATION
        this.frameMap = {
            'six':         { col: 0, row: 0 },
            'four':        { col: 1, row: 0 },
            'running':     { col: 2, row: 0 },
            'dot':         { col: 3, row: 0 },
            'bowled':      { col: 0, row: 1 },
            'caught':      { col: 1, row: 1 },
            'lbw':         { col: 2, row: 1 },
            'run_out':     { col: 3, row: 1 },
            'bowling':     { col: 0, row: 2 },
            'wide':        { col: 1, row: 2 },
            'no_ball':     { col: 2, row: 2 },
            'celebration': { col: 3, row: 2 }
        };

        // Create overlay elements
        this.createOverlay();

        // Preload sprite sheet
        this.img = new Image();
        this.img.src = this.sheetSrc;
    }

    createOverlay() {
        // Main overlay container
        this.overlay = document.createElement('div');
        this.overlay.id = 'sprite-overlay';
        this.overlay.className = 'sprite-overlay hidden';

        // Sprite frame display
        this.frameEl = document.createElement('div');
        this.frameEl.className = 'sprite-frame';
        this.overlay.appendChild(this.frameEl);

        // Outcome text
        this.textEl = document.createElement('div');
        this.textEl.className = 'sprite-text';
        this.overlay.appendChild(this.textEl);

        // Append to center panel (or body as fallback)
        const centerPanel = document.querySelector('.center-panel');
        if (centerPanel) {
            centerPanel.appendChild(this.overlay);
        } else {
            document.body.appendChild(this.overlay);
        }
    }

    // ── Map a ball outcome to a sprite frame key ───────────
    getFrameKey(outcome) {
        if (outcome.wicket) {
            const dismissal = (outcome.dismissal || '').toLowerCase();
            if (dismissal.includes('bowled'))       return 'bowled';
            if (dismissal.includes('lbw'))          return 'lbw';
            if (dismissal.includes('run out'))      return 'run_out';
            return 'caught';  // caught behind, caught at slip, caught in deep
        }
        if (outcome.six)      return 'six';
        if (outcome.boundary) return 'four';
        if (outcome.runs >= 1) return 'running';
        return 'dot';
    }

    // ── Get the text label and CSS class for the outcome ───
    getOutcomeDisplay(outcome) {
        if (outcome.wicket) {
            return {
                text: `WICKET! ${outcome.dismissal || 'OUT'}`,
                cssClass: 'sprite-wicket'
            };
        }
        if (outcome.six) {
            return { text: 'MASSIVE SIX!', cssClass: 'sprite-six' };
        }
        if (outcome.boundary) {
            return { text: 'FOUR!', cssClass: 'sprite-four' };
        }
        if (outcome.runs === 3) {
            return { text: 'THREE RUNS!', cssClass: 'sprite-runs' };
        }
        if (outcome.runs === 2) {
            return { text: 'TWO RUNS', cssClass: 'sprite-runs' };
        }
        if (outcome.runs === 1) {
            return { text: 'SINGLE', cssClass: 'sprite-runs' };
        }
        return { text: 'DOT BALL', cssClass: 'sprite-dot' };
    }

    // ── Show the sprite overlay for a ball outcome ─────────
    show(outcome, duration = 1800) {
        const frameKey = this.getFrameKey(outcome);
        const frame = this.frameMap[frameKey];
        if (!frame) return;

        const display = this.getOutcomeDisplay(outcome);

        // Set sprite background position
        const bgX = -(frame.col * this.cellW);
        const bgY = -(frame.row * this.cellH);
        this.frameEl.style.backgroundImage = `url('${this.sheetSrc}')`;
        this.frameEl.style.backgroundPosition = `${bgX}px ${bgY}px`;
        this.frameEl.style.backgroundSize = `${this.cellW * this.cols}px ${this.cellH * this.rows}px`;
        this.frameEl.style.width = `${this.cellW}px`;
        this.frameEl.style.height = `${this.cellH}px`;

        // Set text
        this.textEl.textContent = display.text;
        this.textEl.className = `sprite-text ${display.cssClass}`;

        // Set animation class based on outcome type
        this.overlay.className = 'sprite-overlay';
        if (outcome.wicket) {
            this.overlay.classList.add('anim-wicket');
        } else if (outcome.six) {
            this.overlay.classList.add('anim-six');
        } else if (outcome.boundary) {
            this.overlay.classList.add('anim-four');
        } else {
            this.overlay.classList.add('anim-normal');
        }

        // Show
        this.overlay.classList.add('active');

        // Auto-hide after duration
        clearTimeout(this._hideTimer);
        this._hideTimer = setTimeout(() => this.hide(), duration);
    }

    hide() {
        this.overlay.classList.remove('active');
        this.overlay.classList.add('hiding');
        setTimeout(() => {
            this.overlay.className = 'sprite-overlay hidden';
        }, 400);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpriteOverlay };
}
