-- Atelier Solidaire uses the local timezone for Angers.
-- TIMESTAMPTZ values remain absolute instants; this setting controls their default display timezone.

DO $$
BEGIN
    EXECUTE format(
        'ALTER DATABASE %I SET timezone TO %L',
        current_database(),
        'Europe/Paris'
    );
END
$$;

SET TIME ZONE 'Europe/Paris';
