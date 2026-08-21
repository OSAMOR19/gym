-- ═══════════════════════════════════════════════════════════════════════════
-- IronTrack Phase 4 — RPE in the atomic workout save
--
-- The workout_sets table already has rpe and weight_kg columns (Phase 1);
-- this replaces save_workout_v1 so the set insert actually carries them.
-- Payloads without these keys (older clients) insert null — fully backward
-- compatible. Apply after the Phase 1 migration; safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.save_workout_v1(payload jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
    v_user       uuid := auth.uid();
    v_session_id uuid;
    v_record_id  text;
    v_set        jsonb;
    v_day        jsonb := payload->'program_day_completed';
begin
    if v_user is null then
        raise exception 'not authenticated';
    end if;

    -- 1. Session
    insert into public.workout_sessions
        (user_id, source, program_id, program_day_index, program_day_name,
         started_at, duration_seconds, total_reps, avg_form_score, xp_gained)
    values
        (v_user,
         coalesce(payload->>'source', 'free'),
         payload->>'program_id',
         (payload->>'program_day_index')::int,
         payload->>'program_day_name',
         (payload->>'started_at')::timestamptz,
         (payload->>'duration_seconds')::int,
         (payload->>'total_reps')::int,
         (payload->>'avg_form_score')::int,
         (payload->>'xp_gained')::int)
    returning id into v_session_id;

    -- 2. Sets (now including rpe and weight_kg)
    for v_set in select * from jsonb_array_elements(coalesce(payload->'sets', '[]'::jsonb))
    loop
        insert into public.workout_sets
            (user_id, session_id, exercise_id, set_number, target_reps,
             completed_reps, weight_kg, rpe, form_score, good_reps, poor_reps,
             hold_seconds, duration_seconds, rest_seconds, completed_at)
        values
            (v_user, v_session_id,
             v_set->>'exercise_id',
             (v_set->>'set_number')::int,
             (v_set->>'target_reps')::int,
             (v_set->>'completed_reps')::int,
             (v_set->>'weight_kg')::numeric,
             (v_set->>'rpe')::int,
             (v_set->>'form_score')::int,
             (v_set->>'good_reps')::int,
             (v_set->>'poor_reps')::int,
             (v_set->>'hold_seconds')::int,
             (v_set->>'duration_seconds')::int,
             (v_set->>'rest_seconds')::int,
             coalesce((v_set->>'completed_at')::timestamptz, now()));
    end loop;

    -- 3. Legacy per-workout record (same shape the client used to insert)
    insert into public.workout_records
        (user_id, exercise_id, exercise_name, reps, form_quality,
         time_under_tension, duration, xp_gained)
    values
        (v_user,
         payload->>'exercise_id',
         payload->>'exercise_name',
         (payload->>'total_reps')::int,
         (payload->>'avg_form_score')::int,
         (payload->>'time_under_tension')::int,
         (payload->>'duration_seconds')::int,
         (payload->>'xp_gained')::int)
    returning id::text into v_record_id;

    -- 4. Completion event
    insert into public.events (user_id, event_type, exercise_id, session_id, metadata)
    values (v_user, 'WORKOUT_COMPLETED', payload->>'exercise_id', v_session_id,
            jsonb_build_object(
                'total_reps', (payload->>'total_reps')::int,
                'avg_form_score', (payload->>'avg_form_score')::int,
                'duration_seconds', (payload->>'duration_seconds')::int,
                'xp_gained', (payload->>'xp_gained')::int,
                'set_count', jsonb_array_length(coalesce(payload->'sets', '[]'::jsonb)),
                'source', coalesce(payload->>'source', 'free'),
                'program_id', payload->>'program_id',
                'workout_name', payload->>'exercise_name'));

    -- 5. Program day completed → progress + event
    if v_day is not null and v_day <> 'null'::jsonb then
        insert into public.program_progress
            (user_id, program_id, completed_days, current_day_index, last_session_at)
        values
            (v_user, v_day->>'program_id',
             array[(v_day->>'day_index')::int],
             (v_day->>'day_index')::int + 1,
             now())
        on conflict (user_id, program_id) do update set
            completed_days = (
                select coalesce(array_agg(distinct d order by d), '{}')
                from unnest(program_progress.completed_days || excluded.completed_days) d
            ),
            current_day_index = greatest(
                coalesce(program_progress.current_day_index, 0),
                (v_day->>'day_index')::int + 1),
            last_session_at = now();

        insert into public.events (user_id, event_type, session_id, metadata)
        values (v_user, 'PROGRAM_DAY_COMPLETED', v_session_id,
                jsonb_build_object(
                    'program_id', v_day->>'program_id',
                    'day_index', (v_day->>'day_index')::int,
                    'day_name', payload->>'program_day_name'));
    end if;

    return jsonb_build_object('session_id', v_session_id, 'record_id', v_record_id);
end;
$$;

grant execute on function public.save_workout_v1(jsonb) to authenticated;
