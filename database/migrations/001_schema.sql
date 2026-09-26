CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- ATELIER SOLIDAIRE
-- Schéma relationnel initial PostgreSQL
-- =========================================================

-- ---------------------------------------------------------
-- Catégories réellement réservables
-- "Je ne sais pas / autre" est traité séparément
-- en préqualification.
-- ---------------------------------------------------------

CREATE TABLE categories (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    code VARCHAR(3) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL UNIQUE,

    capacity_unit_minutes SMALLINT NOT NULL,

    CONSTRAINT chk_category_code
        CHECK (code IN ('IT', 'PEM', 'TXT')),

    CONSTRAINT chk_capacity_unit
        CHECK (capacity_unit_minutes IN (30, 60))
);

-- ---------------------------------------------------------
-- Ateliers
-- ---------------------------------------------------------

CREATE TABLE workshops (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    title VARCHAR(160) NOT NULL,

    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,

    booking_closes_at TIMESTAMPTZ NOT NULL,

    location_name VARCHAR(160) NOT NULL,
    city VARCHAR(100) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_workshop_dates
        CHECK (ends_at > starts_at),

    CONSTRAINT chk_booking_closes_before_start
        CHECK (booking_closes_at <= starts_at),

    CONSTRAINT uq_workshop_time_location
        UNIQUE (starts_at, location_name)
);

-- ---------------------------------------------------------
-- Créneaux d'arrivée
--
-- Il s'agit d'une heure d'arrivée / première prise
-- en charge et non d'une durée de réparation garantie.
-- ---------------------------------------------------------

CREATE TABLE arrival_slots (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    workshop_id BIGINT NOT NULL
        REFERENCES workshops(id)
        ON DELETE CASCADE,

    arrival_at TIMESTAMPTZ NOT NULL,

    window_minutes SMALLINT NOT NULL DEFAULT 60,

    is_open BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_slot_window
        CHECK (window_minutes > 0),

    CONSTRAINT uq_workshop_arrival_slot
        UNIQUE (workshop_id, arrival_at)
);

-- ---------------------------------------------------------
-- Catégories ouvertes sur chaque créneau
-- ---------------------------------------------------------

CREATE TABLE slot_categories (
    slot_id BIGINT NOT NULL
        REFERENCES arrival_slots(id)
        ON DELETE CASCADE,

    category_id SMALLINT NOT NULL
        REFERENCES categories(id)
        ON DELETE RESTRICT,

    is_open BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (slot_id, category_id)
);

-- ---------------------------------------------------------
-- Bénévoles
-- ---------------------------------------------------------

CREATE TABLE volunteers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- Compétences bénévoles
-- ---------------------------------------------------------

CREATE TABLE volunteer_skills (
    volunteer_id BIGINT NOT NULL
        REFERENCES volunteers(id)
        ON DELETE CASCADE,

    category_id SMALLINT NOT NULL
        REFERENCES categories(id)
        ON DELETE RESTRICT,

    PRIMARY KEY (volunteer_id, category_id)
);

-- ---------------------------------------------------------
-- Affectation d'un bénévole à un créneau
--
-- La clé primaire (volunteer_id, slot_id) empêche
-- qu'un même bénévole soit affecté simultanément à
-- plusieurs catégories sur le même créneau.
-- ---------------------------------------------------------

CREATE TABLE volunteer_slot_assignments (
    volunteer_id BIGINT NOT NULL,

    slot_id BIGINT NOT NULL,

    category_id SMALLINT NOT NULL,

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (volunteer_id, slot_id),

    CONSTRAINT fk_assignment_volunteer_skill
        FOREIGN KEY (volunteer_id, category_id)
        REFERENCES volunteer_skills(volunteer_id, category_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assignment_slot_category
        FOREIGN KEY (slot_id, category_id)
        REFERENCES slot_categories(slot_id, category_id)
        ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- Réservations participant
--
-- Pas de compte permanent participant :
-- les données nécessaires sont liées à la réservation.
-- public_token sera utilisé plus tard par le Backend
-- pour le lien personnel sécurisé.
-- ---------------------------------------------------------

CREATE TABLE reservations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    public_token UUID NOT NULL
        DEFAULT gen_random_uuid()
        UNIQUE,

    slot_id BIGINT NOT NULL,

    category_id SMALLINT NOT NULL,

    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,

    email VARCHAR(255) NOT NULL,

    item_name VARCHAR(160) NOT NULL,

    problem_description TEXT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'EXPECTED',

    repair_outcome VARCHAR(40),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,

    CONSTRAINT fk_reservation_slot_category
        FOREIGN KEY (slot_id, category_id)
        REFERENCES slot_categories(slot_id, category_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_reservation_status
        CHECK (
            status IN (
                'EXPECTED',
                'ARRIVED',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED',
                'NO_SHOW'
            )
        ),

    CONSTRAINT chk_repair_outcome
        CHECK (
            repair_outcome IS NULL
            OR repair_outcome IN (
                'REPAIRED',
                'REPAIRABLE_FOLLOW_UP',
                'NOT_REPAIRABLE',
                'DIAGNOSIS_INCONCLUSIVE'
            )
        ),

    CONSTRAINT chk_first_name_not_empty
        CHECK (BTRIM(first_name) <> ''),

    CONSTRAINT chk_last_name_not_empty
        CHECK (BTRIM(last_name) <> ''),

    CONSTRAINT chk_email_not_empty
        CHECK (BTRIM(email) <> ''),

    CONSTRAINT chk_item_not_empty
        CHECK (BTRIM(item_name) <> ''),

    CONSTRAINT chk_problem_not_empty
        CHECK (BTRIM(problem_description) <> '')
);

-- ---------------------------------------------------------
-- Préqualification
--
-- "Je ne sais pas / autre" ne crée pas directement
-- une réservation normale.
-- ---------------------------------------------------------

CREATE TABLE prequalification_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    public_token UUID NOT NULL
        DEFAULT gen_random_uuid()
        UNIQUE,

    workshop_id BIGINT NOT NULL
        REFERENCES workshops(id)
        ON DELETE CASCADE,

    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,

    email VARCHAR(255) NOT NULL,

    item_name VARCHAR(160) NOT NULL,
    problem_description TEXT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    resulting_reservation_id BIGINT
        REFERENCES reservations(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_prequalification_status
        CHECK (
            status IN (
                'PENDING',
                'REVIEWED',
                'ACCEPTED',
                'REJECTED'
            )
        )
);

-- ---------------------------------------------------------
-- Index utiles
-- ---------------------------------------------------------

CREATE INDEX idx_arrival_slots_workshop
    ON arrival_slots(workshop_id);

CREATE INDEX idx_reservations_slot
    ON reservations(slot_id);

CREATE INDEX idx_reservations_status
    ON reservations(status);

CREATE INDEX idx_reservations_email
    ON reservations(email);

CREATE INDEX idx_prequalification_workshop
    ON prequalification_requests(workshop_id);