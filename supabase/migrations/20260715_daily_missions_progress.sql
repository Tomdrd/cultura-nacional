-- Adiciona colunas que faltavam em daily_missions (usadas por generate_daily_missions,
-- que já tentava inserir 'key' e 'xp_reward' sem que essas colunas existissem).
ALTER TABLE public.daily_missions
  ADD COLUMN IF NOT EXISTS key text,
  ADD COLUMN IF NOT EXISTS xp_reward integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Atualiza o progresso das missões diárias do usuário. Chamada pelo client
-- (QuizScreen e DuelScreen) ao final de cada quiz/duelo.
CREATE OR REPLACE FUNCTION public.update_daily_mission_progress(
  p_user_id uuid,
  p_state_id uuid DEFAULT NULL,
  p_correct integer DEFAULT 0,
  p_total integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mission        daily_missions%ROWTYPE;
  v_new_progress   integer;
  v_new_completed  boolean;
  v_states         jsonb;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM generate_daily_missions(p_user_id);

  -- play_quiz: +1 por quiz/duelo finalizado
  FOR v_mission IN
    SELECT * FROM daily_missions
    WHERE user_id = p_user_id AND key = 'play_quiz' AND completed = false AND expires_at > now()
  LOOP
    v_new_progress  := LEAST(v_mission.progress + 1, v_mission.target);
    v_new_completed := v_new_progress >= v_mission.target;
    UPDATE daily_missions SET progress = v_new_progress, completed = v_new_completed WHERE id = v_mission.id;
    IF v_new_completed THEN
      PERFORM update_xp_and_level(p_user_id, v_mission.xp_reward);
    END IF;
  END LOOP;

  -- correct_ans: soma os acertos da rodada
  IF p_correct > 0 THEN
    FOR v_mission IN
      SELECT * FROM daily_missions
      WHERE user_id = p_user_id AND key = 'correct_ans' AND completed = false AND expires_at > now()
    LOOP
      v_new_progress  := LEAST(v_mission.progress + p_correct, v_mission.target);
      v_new_completed := v_new_progress >= v_mission.target;
      UPDATE daily_missions SET progress = v_new_progress, completed = v_new_completed WHERE id = v_mission.id;
      IF v_new_completed THEN
        PERFORM update_xp_and_level(p_user_id, v_mission.xp_reward);
      END IF;
    END LOOP;
  END IF;

  -- explore_state: conta estados distintos jogados hoje (guardado em meta.states)
  IF p_state_id IS NOT NULL THEN
    FOR v_mission IN
      SELECT * FROM daily_missions
      WHERE user_id = p_user_id AND key = 'explore_state' AND completed = false AND expires_at > now()
    LOOP
      v_states := COALESCE(v_mission.meta->'states', '[]'::jsonb);
      IF NOT (v_states @> to_jsonb(p_state_id::text)) THEN
        v_states := v_states || to_jsonb(p_state_id::text);
      END IF;
      v_new_progress  := LEAST(jsonb_array_length(v_states), v_mission.target);
      v_new_completed := v_new_progress >= v_mission.target;
      UPDATE daily_missions
      SET meta      = jsonb_set(COALESCE(v_mission.meta, '{}'::jsonb), '{states}', v_states),
          progress  = v_new_progress,
          completed = v_new_completed
      WHERE id = v_mission.id;
      IF v_new_completed THEN
        PERFORM update_xp_and_level(p_user_id, v_mission.xp_reward);
      END IF;
    END LOOP;
  END IF;
END;
$function$;
