insert into public.badges (
  name,
  description,
  icon,
  category,
  requirement,
  xp_reward,
  is_published
)
values
  ('Listening Survivor', 'Complete seven listening sessions.', '🎧', 'LISTENING', 'Seven listening sessions', 300, true),
  ('Speaking Builder', 'Submit ten speaking responses.', '🗣️', 'SPEAKING', 'Ten speaking submissions', 300, true),
  ('Speed Reader', 'Complete five reading passages within target time.', '📖', 'READING', 'Five passages completed within target time', 250, true),
  ('Trap Killer', 'Answer fifty trap-based MCQs correctly.', '💀', 'MASTERY', 'Fifty trap-based MCQs correct', 400, true)
on conflict do nothing;
