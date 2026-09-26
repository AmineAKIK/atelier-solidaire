-- Additional idempotent scenarios for the past workshop on 2026-09-12 only.

-- Case 1: a completed reservation whose repair outcome is REPAIRED.
INSERT INTO reservations (
    slot_id,
    category_id,
    first_name,
    last_name,
    email,
    item_name,
    problem_description,
    status,
    repair_outcome
)
SELECT
    s.id,
    c.id,
    'Alice',
    'Scenario',
    'scenario.completed@example.test',
    'Ordinateur portable',
    'Le connecteur de charge ne fonctionnait plus.',
    'COMPLETED',
    'REPAIRED'
FROM workshops w
JOIN arrival_slots s
    ON s.workshop_id = w.id
JOIN slot_categories sc
    ON sc.slot_id = s.id
JOIN categories c
    ON c.id = sc.category_id
WHERE
    w.starts_at = '2026-09-12 09:00:00+02'
    AND s.arrival_at = '2026-09-12 09:00:00+02'
    AND c.code = 'IT'
    AND NOT EXISTS (
        SELECT 1
        FROM reservations r
        WHERE
            r.slot_id = s.id
            AND r.category_id = c.id
            AND r.email = 'scenario.completed@example.test'
    );

-- Case 2: a participant who did not attend the booked slot.
INSERT INTO reservations (
    slot_id,
    category_id,
    first_name,
    last_name,
    email,
    item_name,
    problem_description,
    status
)
SELECT
    s.id,
    c.id,
    'Nora',
    'Scenario',
    'scenario.no-show@example.test',
    'Bouilloire',
    'La bouilloire ne chauffe plus.',
    'NO_SHOW'
FROM workshops w
JOIN arrival_slots s
    ON s.workshop_id = w.id
JOIN slot_categories sc
    ON sc.slot_id = s.id
JOIN categories c
    ON c.id = sc.category_id
WHERE
    w.starts_at = '2026-09-12 09:00:00+02'
    AND s.arrival_at = '2026-09-12 10:00:00+02'
    AND c.code = 'PEM'
    AND NOT EXISTS (
        SELECT 1
        FROM reservations r
        WHERE
            r.slot_id = s.id
            AND r.category_id = c.id
            AND r.email = 'scenario.no-show@example.test'
    );

-- Case 3: a reservation cancelled before its arrival slot.
INSERT INTO reservations (
    slot_id,
    category_id,
    first_name,
    last_name,
    email,
    item_name,
    problem_description,
    status,
    cancelled_at
)
SELECT
    s.id,
    c.id,
    'Lina',
    'Scenario',
    'scenario.cancelled@example.test',
    'Veste',
    'La fermeture éclair doit être remplacée.',
    'CANCELLED',
    '2026-09-12 10:30:00+02'::TIMESTAMPTZ
FROM workshops w
JOIN arrival_slots s
    ON s.workshop_id = w.id
JOIN slot_categories sc
    ON sc.slot_id = s.id
JOIN categories c
    ON c.id = sc.category_id
WHERE
    w.starts_at = '2026-09-12 09:00:00+02'
    AND s.arrival_at = '2026-09-12 11:00:00+02'
    AND c.code = 'TXT'
    AND NOT EXISTS (
        SELECT 1
        FROM reservations r
        WHERE
            r.slot_id = s.id
            AND r.category_id = c.id
            AND r.email = 'scenario.cancelled@example.test'
    );

-- Case 4: a prequalification request still waiting for review.
INSERT INTO prequalification_requests (
    workshop_id,
    first_name,
    last_name,
    email,
    item_name,
    problem_description,
    status
)
SELECT
    w.id,
    'Samir',
    'Scenario',
    'scenario.prequalification-pending@example.test',
    'Objet non identifié',
    'La catégorie de réparation doit être déterminée par l''association.',
    'PENDING'
FROM workshops w
WHERE
    w.starts_at = '2026-09-12 09:00:00+02'
    AND NOT EXISTS (
        SELECT 1
        FROM prequalification_requests p
        WHERE
            p.workshop_id = w.id
            AND p.email = 'scenario.prequalification-pending@example.test'
    );

-- Case 5: an accepted prequalification linked to its resulting reservation.
INSERT INTO prequalification_requests (
    workshop_id,
    first_name,
    last_name,
    email,
    item_name,
    problem_description,
    status,
    resulting_reservation_id
)
SELECT
    w.id,
    r.first_name,
    r.last_name,
    r.email,
    r.item_name,
    r.problem_description,
    'ACCEPTED',
    r.id
FROM workshops w
JOIN arrival_slots s
    ON s.workshop_id = w.id
JOIN reservations r
    ON r.slot_id = s.id
WHERE
    w.starts_at = '2026-09-12 09:00:00+02'
    AND r.email = 'scenario.completed@example.test'
    AND NOT EXISTS (
        SELECT 1
        FROM prequalification_requests p
        WHERE
            p.workshop_id = w.id
            AND p.email = 'scenario.completed@example.test'
            AND p.status = 'ACCEPTED'
    );
