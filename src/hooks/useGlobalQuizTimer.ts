import { useRef, useState, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';

interface UseGlobalQuizTimerParams {
  totalSeconds: number;
  onExpire: () => void;
}

interface UseGlobalQuizTimerReturn {
  timeLeft: number;
  progressAnim: Animated.Value;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

// Cronometro unico regressivo para o quiz inteiro (nao mais por pergunta).
// - start() e idempotente: chamar de novo enquanto ja estiver rodando nao reseta nem duplica o interval.
// - pause()/resume() sao usados quando answered === true (revisao de explicacao / report modal),
//   ver docs/PLANO_TIMER_ACESSIBILIDADE.md para a regra completa.
// - stop() limpa tudo; chame antes de start() se quiser reiniciar o timer do zero (ex: "jogar novamente").
export function useGlobalQuizTimer({ totalSeconds, onExpire }: UseGlobalQuizTimerParams): UseGlobalQuizTimerReturn {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const progressAnim = useRef(new Animated.Value(1)).current;

  const intervalRef   = useRef<any>(null);
  const pausedRef     = useRef(false);
  const startedRef    = useRef(false);
  const timeLeftRef   = useRef(totalSeconds);
  const onExpireRef   = useRef(onExpire);

  // Evita closures obsoletas caso o callback onExpire mude entre renders
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  const animateProgressTo = useCallback((fraction: number) => {
    Animated.timing(progressAnim, {
      toValue: fraction,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const tick = useCallback(() => {
    if (pausedRef.current) return;
    timeLeftRef.current -= 1;
    const next = Math.max(timeLeftRef.current, 0);
    setTimeLeft(next);
    animateProgressTo(next / totalSeconds);
    if (next <= 0) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      onExpireRef.current();
    }
  }, [totalSeconds, animateProgressTo]);

  const start = useCallback(() => {
    if (startedRef.current) return; // idempotente - protege o Duelo, que pode chamar start() em 2 lugares
    startedRef.current = true;
    pausedRef.current = false;
    timeLeftRef.current = totalSeconds;
    setTimeLeft(totalSeconds);
    progressAnim.setValue(1);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 1000);
  }, [totalSeconds, tick, progressAnim]);

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
  }, []);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    startedRef.current = false;
    pausedRef.current = false;
  }, []);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => { clearInterval(intervalRef.current); };
  }, []);

  return { timeLeft, progressAnim, start, pause, resume, stop };
}
