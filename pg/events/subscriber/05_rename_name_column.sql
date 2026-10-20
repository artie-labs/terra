-- apply: after-publisher
-- Either order produces a window of "missing replicated column" errors on the
-- subscriber, because columns match by name. Renaming here right after the
-- publisher keeps the window short; the apply worker retries and catches up.
ALTER TABLE animals RENAME COLUMN name TO display_name;
