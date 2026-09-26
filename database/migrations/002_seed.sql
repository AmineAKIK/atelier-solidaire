-- =========================================================
-- Données de démonstration Atelier Solidaire
-- =========================================================

-- Catégories

INSERT INTO categories (
    code,
    name,
    capacity_unit_minutes
)
VALUES
    ('IT', 'Informatique', 60),
    ('PEM', 'Petit électroménager', 60),
    ('TXT', 'Couture & textile', 30)
ON CONFLICT (code) DO NOTHING;


-- Atelier utilisé dans les maquettes Front

INSERT INTO workshops (
    title,
    starts_at,
    ends_at,
    booking_closes_at,
    location_name,
    city
)
VALUES (
    'Atelier du samedi 12 septembre 2026',
    '2026-09-12 09:00:00+02',
    '2026-09-12 12:00:00+02',
    '2026-09-11 09:00:00+02',
    'Maison de quartier des Hauts-de-Saint-Aubin',
    'Angers'
)
ON CONFLICT (starts_at, location_name) DO NOTHING;


-- Créneaux d'arrivée

INSERT INTO arrival_slots (
    workshop_id,
    arrival_at,
    window_minutes
)
SELECT
    w.id,
    slot.arrival_at,
    60
FROM workshops w
CROSS JOIN (
    VALUES
        ('2026-09-12 09:00:00+02'::TIMESTAMPTZ),
        ('2026-09-12 10:00:00+02'::TIMESTAMPTZ),
        ('2026-09-12 11:00:00+02'::TIMESTAMPTZ)
) AS slot(arrival_at)
WHERE w.starts_at = '2026-09-12 09:00:00+02'
ON CONFLICT (workshop_id, arrival_at) DO NOTHING;


-- Chaque catégorie peut être proposée sur chaque créneau

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
WHERE w.starts_at = '2026-09-12 09:00:00+02'
ON CONFLICT DO NOTHING;


-- Bénévoles de démonstration

INSERT INTO volunteers (
    first_name,
    last_name,
    email
)
VALUES
    ('Claire', 'Martin', 'claire.martin@example.test'),
    ('Louis', 'Bernard', 'louis.bernard@example.test'),
    ('Sophie', 'Dubois', 'sophie.dubois@example.test')
ON CONFLICT (email) DO NOTHING;


-- Compétences

INSERT INTO volunteer_skills (
    volunteer_id,
    category_id
)
SELECT
    v.id,
    c.id
FROM volunteers v
JOIN categories c
    ON (
        (v.email = 'claire.martin@example.test' AND c.code = 'IT')
        OR
        (
            v.email = 'louis.bernard@example.test'
            AND c.code IN ('IT', 'PEM')
        )
        OR
        (v.email = 'sophie.dubois@example.test' AND c.code = 'TXT')
    )
ON CONFLICT DO NOTHING;


-- Affectation des bénévoles aux créneaux.
-- Louis est multi-compétent mais n'est affecté qu'à PEM :
-- la BDD interdit son double comptage sur le même créneau.

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
WHERE w.starts_at = '2026-09-12 09:00:00+02'
ON CONFLICT DO NOTHING;


-- Une réservation fictive permet de tester la persistance.

INSERT INTO reservations (
    slot_id,
    category_id,
    first_name,
    last_name,
    email,
    item_name,
    problem_description
)
SELECT
    s.id,
    c.id,
    'Camille',
    'Demo',
    'camille.demo@example.test',
    'Ordinateur portable',
    'L''ordinateur ne démarre plus.'
FROM arrival_slots s
JOIN workshops w
    ON w.id = s.workshop_id
JOIN categories c
    ON c.code = 'IT'
WHERE
    w.starts_at = '2026-09-12 09:00:00+02'
    AND s.arrival_at = '2026-09-12 11:00:00+02'
    AND NOT EXISTS (
        SELECT 1
        FROM reservations r
        WHERE
            r.slot_id = s.id
            AND r.email = 'camille.demo@example.test'
    );