// src/utils/audioService.ts
class AudioService {
  private ctx: AudioContext | null = null;
  private lastPlayTime: number = 0;
  private readonly MIN_INTERVAL = 0.05; // 최소 50ms 간격 유지

  private getContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  play(frequency: number, type: OscillatorType, duration: number, volume: number) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // 오디오 클리핑 방지: 너무 짧은 간격의 연속 재생 차단
      if (now - this.lastPlayTime < this.MIN_INTERVAL) {
        return; 
      }
      this.lastPlayTime = now;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      
      // 부드러운 시작과 종료 (Click 소리 방지)
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }
}

export const audioService = new AudioService();