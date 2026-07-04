import { useCallback } from 'react';
import { Vibration } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Hook compartilhado de feedback de quiz (som + vibração).
 * Usado por QuizScreen e ViralModeScreen para manter a lógica
 * de efeitos sonoros e vibração consistente em todo o app.
 */
export function useQuizFeedback() {
  const { audioSfx } = useSettingsStore();

  const playerCorrect = useAudioPlayer(require('../../assets/sounds/correct.mp3'));
  const playerWrong   = useAudioPlayer(require('../../assets/sounds/wrong.mp3'));
  const playerWin     = useAudioPlayer(require('../../assets/sounds/win.mp3'));
  const playerLose    = useAudioPlayer(require('../../assets/sounds/lose.mp3'));

  const playCorrect = useCallback(() => {
    if (!audioSfx) return;
    playerCorrect.seekTo(0);
    playerCorrect.play();
  }, [audioSfx, playerCorrect]);

  const playWrong = useCallback(() => {
    if (!audioSfx) return;
    playerWrong.seekTo(0);
    playerWrong.play();
  }, [audioSfx, playerWrong]);

  const playResult = useCallback((won: boolean) => {
    if (!audioSfx) return;
    const player = won ? playerWin : playerLose;
    player.seekTo(0);
    player.play();
  }, [audioSfx, playerWin, playerLose]);

  const vibrateSelect = useCallback(() => {
    Vibration.vibrate(40);
  }, []);

  return { playCorrect, playWrong, playResult, vibrateSelect };
}
