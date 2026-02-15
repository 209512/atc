import { useCallback } from 'react';
import { audioService } from '../utils/audioService';

export const useAudio = (isAdminMuted: boolean) => {
  // isAdminMuted가 바뀔 때마다 play 함수들을 새로 생성하여 최신 값을 참조하게 함
  const playClick = useCallback(() => {
    if (isAdminMuted) return;
    audioService.play(1200, 'sine', 0.03, 0.02); 
  }, [isAdminMuted]);

  const playSuccess = useCallback(() => {
    if (isAdminMuted) return;
    audioService.play(440, 'sine', 0.1, 0.04);
    setTimeout(() => {
      // 비동기 시점에도 최신 값을 체크하려면 이 안에서도 로직이 필요할 수 있음
      audioService.play(880, 'sine', 0.1, 0.03);
    }, 40);
  }, [isAdminMuted]);

  const playWarning = useCallback(() => {
    if (isAdminMuted) return;
    audioService.play(110, 'square', 0.2, 0.02);
  }, [isAdminMuted]);

  const playAlert = useCallback(() => {
    if (isAdminMuted) return;
    audioService.play(220, 'sawtooth', 0.3, 0.02);
    setTimeout(() => {
      audioService.play(220, 'sawtooth', 0.3, 0.02);
    }, 150);
  }, [isAdminMuted]);

  return { playClick, playSuccess, playWarning, playAlert };
};