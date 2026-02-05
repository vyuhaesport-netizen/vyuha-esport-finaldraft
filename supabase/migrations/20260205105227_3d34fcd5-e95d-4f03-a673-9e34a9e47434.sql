-- Add unique constraint on username in profiles table
-- First, handle any existing duplicates by appending a random suffix
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT username, array_agg(id ORDER BY created_at DESC) as ids
        FROM profiles 
        WHERE username IS NOT NULL 
        GROUP BY username 
        HAVING COUNT(*) > 1
    LOOP
        -- Update all but the first (oldest) duplicate
        FOR i IN 2..array_length(r.ids, 1) LOOP
            UPDATE profiles 
            SET username = r.username || substr(md5(random()::text), 1, 4)
            WHERE id = r.ids[i];
        END LOOP;
    END LOOP;
END $$;

-- Now create the unique index (allows NULLs but enforces uniqueness for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx ON profiles (username) WHERE username IS NOT NULL;