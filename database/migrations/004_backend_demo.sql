-- Atelier futur de démonstration pour les vérifications Backend.

INSERT INTO workshops (
    title,
    starts_at,
    ends_at,
    booking_closes_at,
    location_name,
    city
)
VALUES (
    'Atelier de démonstration Backend',
    '2026-10-10 09:00:00+02',
    '2026-10-10 12:00:00+02',
    '2026-10-09 09:00:00+02',
    'Maison de quartier des Hauts-de-Saint-Aubin',
    'Angers'
)
ON CONFLICT (starts_at, location_name) DO NOTHING;

INSERT INTO arrival_slots (
    workshop_id,
    arrival_at,
    window_minutes
)
SELECT
    w.id,
    v.arrival_at,
    60
FROM workshops w
CROSS JOIN (
    VALUES
        ('2026-10-10 09:00:00+02'::TIMESTAMPTZ),
        ('2026-10-10 10:00:00+02'::TIMESTAMPTZ),
        ('2026-10-10 11:00:00+02'::TIMESTAMPTZ)
) AS v(arrival_at)
WHERE w.starts_at = '2026-10-10 09:00:00+02'
ON CONFLICT (workshop_id, arrival_at) DO NOTHING;

INSERT INTO slot_categories (
    slot_id,
    category_id
)
SELECT
    s.id,
    c.id
FROM arrival_slots s
JOIN workshops w
    ON w.id = s.workshop_id
CROSS JOIN categories c
WHERE w.starts_at = '2026-10-10 09:00:00+02'
ON CONFLICT DO NOTHING;

INSERT INTO volunteer_slot_assignments (
    volunteer_id,
    slot_id,
    category_id
)
SELECT
    v.id,
    s.id,
    c.id
FROM volunteers v
JOIN arrival_slots s
    ON TRUE
JOIN workshops w
    ON w.id = s.workshop_id
JOIN categories c
    ON (
        (v.email = 'claire.martin@example.test' AND c.code = 'IT')
        OR
        (v.email = 'louis.bernard@example.test' AND c.code = 'PEM')
        OR
        (v.email = 'sophie.dubois@example.test' AND c.code = 'TXT')
    )
WHERE w.starts_at = '2026-10-10 09:00:00+02'
ON CONFLICT DO NOTHING;
