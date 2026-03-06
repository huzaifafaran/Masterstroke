// ============================================================
// CRICKET LEGENDS — Canvas Renderer
// ============================================================

class GameRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.animations = [];
        this.particles = [];
        this.wagonWheelData = [];
        this.fieldPositions = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const container = this.canvas.parentElement;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.fieldRadius = Math.min(this.width, this.height) * 0.42;
    }

    // ── Main render loop ───────────────────────────────────
    render(gameState) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawField();
        this.drawPitch();
        this.drawFielders(gameState);
        this.drawBatter(gameState);
        this.drawBowler(gameState);
        this.drawWagonWheel(gameState);
        this.updateParticles();
        this.drawParticles();
        this.updateAnimations();
    }

    // ── Cricket Field ──────────────────────────────────────
    drawField() {
        const ctx = this.ctx;
        // Outfield gradient
        const grad = ctx.createRadialGradient(
            this.centerX, this.centerY, this.fieldRadius * 0.3,
            this.centerX, this.centerY, this.fieldRadius
        );
        grad.addColorStop(0, '#2d5a1e');
        grad.addColorStop(0.7, '#1e4a12');
        grad.addColorStop(1, '#153a0c');

        ctx.beginPath();
        ctx.ellipse(this.centerX, this.centerY, this.fieldRadius, this.fieldRadius * 0.85, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Boundary rope
        ctx.beginPath();
        ctx.ellipse(this.centerX, this.centerY, this.fieldRadius, this.fieldRadius * 0.85, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 30-yard circle
        const innerRadius = this.fieldRadius * 0.45;
        ctx.beginPath();
        ctx.ellipse(this.centerX, this.centerY, innerRadius, innerRadius * 0.85, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // ── Pitch Strip ────────────────────────────────────────
    drawPitch() {
        const ctx = this.ctx;
        const pitchWidth = this.fieldRadius * 0.06;
        const pitchLength = this.fieldRadius * 0.35;

        ctx.save();
        ctx.translate(this.centerX, this.centerY);

        // Pitch rect
        ctx.fillStyle = '#c4a35a';
        ctx.fillRect(-pitchWidth / 2, -pitchLength / 2, pitchWidth, pitchLength);

        // Crease lines
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;

        // Batting crease
        ctx.beginPath();
        ctx.moveTo(-pitchWidth * 1.2, pitchLength * 0.4);
        ctx.lineTo(pitchWidth * 1.2, pitchLength * 0.4);
        ctx.stroke();

        // Bowling crease
        ctx.beginPath();
        ctx.moveTo(-pitchWidth * 1.2, -pitchLength * 0.4);
        ctx.lineTo(pitchWidth * 1.2, -pitchLength * 0.4);
        ctx.stroke();

        // Stumps
        this.drawStumps(0, pitchLength * 0.4, 'batting');
        this.drawStumps(0, -pitchLength * 0.4, 'bowling');

        ctx.restore();
    }

    drawStumps(x, y, type) {
        const ctx = this.ctx;
        const spacing = 3;
        ctx.fillStyle = '#f0e6c8';
        for (let i = -1; i <= 1; i++) {
            ctx.fillRect(x + i * spacing - 1, y - 6, 2, 12);
        }
        // Bails
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x - spacing - 1, y - 7, spacing * 2 + 2, 2);
    }

    // ── Fielder Positions ──────────────────────────────────
    drawFielders(gameState) {
        const ctx = this.ctx;
        const positions = this.getDefaultFieldPositions();

        positions.forEach((pos, i) => {
            const x = this.centerX + pos.x * this.fieldRadius;
            const y = this.centerY + pos.y * this.fieldRadius * 0.85;

            // Fielder dot
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#4a9eff';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label
            ctx.font = '9px Inter, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.textAlign = 'center';
            ctx.fillText(pos.label, x, y + 16);
        });
    }

    getDefaultFieldPositions() {
        return [
            { x: 0, y: -0.15, label: 'WK' },
            { x: 0.15, y: -0.2, label: 'Slip' },
            { x: -0.35, y: -0.5, label: 'Mid-off' },
            { x: 0.35, y: -0.5, label: 'Mid-on' },
            { x: -0.6, y: -0.25, label: 'Cover' },
            { x: 0.6, y: -0.15, label: 'Sq Leg' },
            { x: -0.7, y: 0.3, label: 'Deep C' },
            { x: 0.7, y: 0.35, label: 'Deep MW' },
            { x: 0, y: 0.75, label: 'Long-on' }
        ];
    }

    // ── Batter ─────────────────────────────────────────────
    drawBatter(gameState) {
        const ctx = this.ctx;
        const x = this.centerX;
        const y = this.centerY + this.fieldRadius * 0.35 * 0.4;

        // Batter figure
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6b35';
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bat line
        ctx.beginPath();
        ctx.moveTo(x + 4, y - 2);
        ctx.lineTo(x + 14, y - 10);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }

    // ── Bowler ─────────────────────────────────────────────
    drawBowler(gameState) {
        const ctx = this.ctx;
        const x = this.centerX;
        const y = this.centerY - this.fieldRadius * 0.35 * 0.4;

        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // ── Wagon Wheel ────────────────────────────────────────
    drawWagonWheel(gameState) {
        const ctx = this.ctx;
        if (!gameState || !gameState.wagonWheel) return;

        gameState.wagonWheel.forEach(shot => {
            const angle = (shot.angle * Math.PI) / 180;
            const maxDist = this.fieldRadius * 0.9;
            const dist = Math.min(shot.distance / 100 * maxDist, maxDist);

            const endX = this.centerX + Math.cos(angle) * dist;
            const endY = this.centerY + Math.sin(angle) * dist * 0.85;

            ctx.beginPath();
            ctx.moveTo(this.centerX, this.centerY + this.fieldRadius * 0.12);
            ctx.lineTo(endX, endY);

            if (shot.runs === 6) {
                ctx.strokeStyle = 'rgba(255, 107, 53, 0.6)';
                ctx.lineWidth = 2.5;
            } else if (shot.runs === 4) {
                ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1;
            }
            ctx.stroke();
        });
    }

    // ── Ball Animation ─────────────────────────────────────
    animateBall(result, callback) {
        const startX = this.centerX;
        const startY = this.centerY - this.fieldRadius * 0.14;
        const angle = ((result.angle || 0) * Math.PI) / 180;
        const dist = Math.min((result.distance || 30) / 100, 1) * this.fieldRadius * 0.85;

        const endX = this.centerX + Math.cos(angle) * dist;
        const endY = this.centerY + Math.sin(angle) * dist * 0.85;

        const duration = 600;
        const startTime = Date.now();

        const anim = {
            update: () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);

                const x = startX + (endX - startX) * eased;
                const y = startY + (endY - startY) * eased;

                // Draw ball
                this.ctx.beginPath();
                this.ctx.arc(x, y, 4, 0, Math.PI * 2);
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fill();
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();

                // Trail
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(x, y);
                this.ctx.strokeStyle = 'rgba(255,0,0,0.3)';
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();

                if (progress >= 1) {
                    // Spawn particles on boundary
                    if (result.runs >= 4) this.spawnBoundaryParticles(endX, endY, result.runs === 6);
                    if (callback) callback();
                    return true; // done
                }
                return false;
            }
        };
        this.animations.push(anim);
    }

    // ── Particles ──────────────────────────────────────────
    spawnBoundaryParticles(x, y, isSix) {
        const count = isSix ? 30 : 15;
        const colors = isSix ?
            ['#ff6b35', '#ffd700', '#ff4444', '#ff8c00'] :
            ['#00bfff', '#4a9eff', '#87ceeb', '#ffffff'];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.015 + Math.random() * 0.02,
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }

    updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.life -= p.decay;
            return p.life > 0;
        });
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
    }

    updateAnimations() {
        this.animations = this.animations.filter(anim => !anim.update());
    }

    // ── Timing Bar Rendering ───────────────────────────────
    drawTimingBar(position, zones, isActive) {
        if (!isActive) return;
        const ctx = this.ctx;
        const barWidth = 300;
        const barHeight = 20;
        const x = (this.width - barWidth) / 2;
        const y = this.height - 80;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x - 10, y - 10, barWidth + 20, barHeight + 20);

        // Early zone
        ctx.fillStyle = 'rgba(255,100,100,0.4)';
        ctx.fillRect(x, y, barWidth * (zones.early / zones.total), barHeight);

        // Perfect zone
        const perfectStart = x + barWidth * (zones.early / zones.total);
        const perfectWidth = barWidth * (zones.perfect / zones.total);
        const perfectGrad = ctx.createLinearGradient(perfectStart, y, perfectStart + perfectWidth, y);
        perfectGrad.addColorStop(0, 'rgba(50,205,50,0.5)');
        perfectGrad.addColorStop(0.5, 'rgba(50,255,50,0.8)');
        perfectGrad.addColorStop(1, 'rgba(50,205,50,0.5)');
        ctx.fillStyle = perfectGrad;
        ctx.fillRect(perfectStart, y, perfectWidth, barHeight);

        // Late zone
        ctx.fillStyle = 'rgba(255,165,0,0.4)';
        ctx.fillRect(perfectStart + perfectWidth, y, barWidth * (zones.late / zones.total), barHeight);

        // Indicator
        const indicatorX = x + (position / 100) * barWidth;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(indicatorX - 2, y - 3, 4, barHeight + 6);

        // Glow
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fillRect(indicatorX - 1, y - 2, 2, barHeight + 4);
        ctx.shadowBlur = 0;

        // Labels
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff6666';
        ctx.fillText('EARLY', x + barWidth * (zones.early / zones.total) / 2, y + barHeight + 14);
        ctx.fillStyle = '#50ff50';
        ctx.fillText('PERFECT', perfectStart + perfectWidth / 2, y + barHeight + 14);
        ctx.fillStyle = '#ffa500';
        ctx.fillText('LATE', perfectStart + perfectWidth + barWidth * (zones.late / zones.total) / 2, y + barHeight + 14);
    }

    // ── Execution Meter Rendering ──────────────────────────
    drawExecutionMeter(position, isActive) {
        if (!isActive) return;
        const ctx = this.ctx;
        const barWidth = 250;
        const barHeight = 16;
        const x = (this.width - barWidth) / 2;
        const y = this.height - 70;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x - 10, y - 10, barWidth + 20, barHeight + 20);

        // Gradient bar
        const grad = ctx.createLinearGradient(x, y, x + barWidth, y);
        grad.addColorStop(0, 'rgba(255,50,50,0.5)');
        grad.addColorStop(0.4, 'rgba(255,215,0,0.5)');
        grad.addColorStop(0.5, 'rgba(50,255,50,0.8)');
        grad.addColorStop(0.6, 'rgba(255,215,0,0.5)');
        grad.addColorStop(1, 'rgba(255,50,50,0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Center target line
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(x + barWidth / 2 - 1, y - 2, 2, barHeight + 4);

        // Indicator
        const indicatorX = x + (position / 100) * barWidth;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(indicatorX - 2, y - 4, 4, barHeight + 8);
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fillRect(indicatorX - 1, y - 3, 2, barHeight + 6);
        ctx.shadowBlur = 0;

        // Label
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#50ff50';
        ctx.fillText('PERFECT', x + barWidth / 2, y + barHeight + 14);
    }

    // ── Bowling Target on Pitch ────────────────────────────
    drawBowlingTarget(aimX, aimY, coneRadius, isActive) {
        if (!isActive) return;
        const ctx = this.ctx;

        // Map aim coordinates (0-100) to pitch area on canvas
        const pitchWidth = this.fieldRadius * 0.06;
        const pitchLength = this.fieldRadius * 0.35;

        const px = this.centerX + (aimX / 100 - 0.5) * pitchWidth * 4;
        const py = this.centerY + (aimY / 100 - 0.5) * pitchLength;

        // Aim cone (circle)
        const radius = (coneRadius / 30) * 20 + 5;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,50,50,0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center crosshair
        ctx.beginPath();
        ctx.moveTo(px - 5, py);
        ctx.lineTo(px + 5, py);
        ctx.moveTo(px, py - 5);
        ctx.lineTo(px, py + 5);
        ctx.strokeStyle = 'rgba(255,50,50,0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // ── Flash effects ──────────────────────────────────────
    flashScreen(color, duration = 200) {
        const startTime = Date.now();
        this.animations.push({
            update: () => {
                const elapsed = Date.now() - startTime;
                const alpha = Math.max(0, 1 - elapsed / duration) * 0.3;
                this.ctx.fillStyle = color.replace('1)', `${alpha})`);
                this.ctx.fillRect(0, 0, this.width, this.height);
                return elapsed >= duration;
            }
        });
    }

    // ── Wicket animation ───────────────────────────────────
    wicketEffect() {
        this.flashScreen('rgba(255,0,0,1)', 400);
        const cx = this.centerX;
        const cy = this.centerY;
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: cx, y: cy,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 5 - 2,
                life: 1, decay: 0.02,
                size: 3, color: '#ff4444'
            });
        }
    }

    // ── Boundary animation ─────────────────────────────────
    boundaryEffect(isSix) {
        this.flashScreen(isSix ? 'rgba(255,107,53,1)' : 'rgba(0,191,255,1)', 300);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameRenderer };
}
