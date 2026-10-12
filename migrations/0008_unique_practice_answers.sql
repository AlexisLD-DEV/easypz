DELETE FROM practice_answers
WHERE id NOT IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY attempt_id, question_id
        ORDER BY created_at ASC, id ASC
      ) AS row_number
    FROM practice_answers
  )
  WHERE row_number = 1
);

UPDATE practice_attempts
SET
  score = COALESCE((
    SELECT SUM(practice_answers.points)
    FROM practice_answers
    WHERE practice_answers.attempt_id = practice_attempts.id
  ), 0),
  total_points = COALESCE((
    SELECT SUM(questions.points)
    FROM practice_answers
    JOIN questions ON questions.id = practice_answers.question_id
    WHERE practice_answers.attempt_id = practice_attempts.id
  ), 0);

CREATE UNIQUE INDEX IF NOT EXISTS practice_answers_attempt_question_idx
ON practice_answers(attempt_id, question_id);
