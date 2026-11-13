-- One-time data backfill, kept separate from schema migrations.
-- Freeze the previous roster before any v0.2 class edits are allowed.
UPDATE sessions SET roster_snapshot=(
 SELECT json_object('class_label',c.label,'school_year',c.school_year,'students',json(COALESCE((
  SELECT json_group_array(json_object('id',s.id,'ordinal',s.ordinal,'name',s.name)) FROM students s WHERE s.classroom_id=c.id
 ),'[]'))) FROM classrooms c WHERE c.id=sessions.classroom_id
) WHERE roster_snapshot IS NULL;
