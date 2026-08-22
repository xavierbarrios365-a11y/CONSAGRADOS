/**
 * 🔊 SISTEMA DE EFECTOS DE AUDIO TÁCTICOS Y HÁPTICOS (WEB AUDIO API & VIBRATION)
 * Genera sonidos ciber-tácticos puros sin descargas externas.
 */

class TacticalSoundManager {
    private ctx: AudioContext | null = null;
    private isMuted: boolean = false;

    private getContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    /**
     * 🏆 Sonido de Victoria Épica / Racha Asegurada (Acorde Triunfal)
     */
    playVictoryChime() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        // Vibración háptica en móvil
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([100, 50, 150, 50, 250]);
        }

        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Acorde Mayor Ascendente)

        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + index * 0.1);

            gain.gain.setValueAtTime(0.01, now + index * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.2, now + index * 0.1 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.6);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + index * 0.1);
            osc.stop(now + index * 0.1 + 0.65);
        });
    }

    /**
     * ⚡ Sonido de Nivel Superado / Desbloqueo de Escudo
     */
    playLevelUp() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([80, 40, 80]);
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    /**
     * 🔥 Sonido de Reacción Social / Tap
     */
    playReactionPop() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(30);
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.09);
    }

    /**
     * 🚨 Sonido de Error / Alerta
     */
    playErrorBuzz() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([150, 50, 150]);
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.setValueAtTime(120, now + 0.1);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }
}

export const tacticalSound = new TacticalSoundManager();
