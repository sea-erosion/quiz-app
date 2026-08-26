create or replace function apply_score_to_player() returns trigger as $$
begin
  update players
  set score = score + new.points_awarded
  where id = new.player_id;

  return new;
end;
$$ language plpgsql;

create trigger trg_apply_score_to_player
  after insert on answers
  for each row execute function apply_score_to_player();
