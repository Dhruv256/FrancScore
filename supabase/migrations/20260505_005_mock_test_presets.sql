do $$
declare
  tef_id uuid;
  tcf_id uuid;
  mixed_id uuid;
begin
  if not exists (select 1 from public.mock_tests where title = 'TEF Canada Quick Mock') then
    insert into public.mock_tests (title, description, exam_type, is_published)
    values ('TEF Canada Quick Mock', 'Compact TEF Canada simulator for all four skills.', 'TEF_CANADA', true)
    returning id into tef_id;

    insert into public.mock_test_sections (mock_test_id, skill_type, sort_order, question_count, duration_minutes)
    values
      (tef_id, 'LISTENING', 0, 4, 8),
      (tef_id, 'READING', 1, 4, 8),
      (tef_id, 'WRITING', 2, 1, 12),
      (tef_id, 'SPEAKING', 3, 1, 10);
  end if;

  if not exists (select 1 from public.mock_tests where title = 'TCF Canada Quick Mock') then
    insert into public.mock_tests (title, description, exam_type, is_published)
    values ('TCF Canada Quick Mock', 'Compact TCF Canada simulator for all four skills.', 'TCF_CANADA', true)
    returning id into tcf_id;

    insert into public.mock_test_sections (mock_test_id, skill_type, sort_order, question_count, duration_minutes)
    values
      (tcf_id, 'LISTENING', 0, 4, 8),
      (tcf_id, 'READING', 1, 4, 8),
      (tcf_id, 'WRITING', 2, 1, 12),
      (tcf_id, 'SPEAKING', 3, 1, 10);
  end if;

  if not exists (select 1 from public.mock_tests where title = 'Mixed Mode Quick Mock') then
    insert into public.mock_tests (title, description, exam_type, is_published)
    values ('Mixed Mode Quick Mock', 'A blended TEF/TCF simulator using shorter V1 section lengths.', 'MIXED', true)
    returning id into mixed_id;

    insert into public.mock_test_sections (mock_test_id, skill_type, sort_order, question_count, duration_minutes)
    values
      (mixed_id, 'LISTENING', 0, 5, 10),
      (mixed_id, 'READING', 1, 5, 10),
      (mixed_id, 'WRITING', 2, 1, 12),
      (mixed_id, 'SPEAKING', 3, 1, 10);
  end if;
end $$;
