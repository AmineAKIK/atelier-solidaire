-- Atelier Solidaire utilise l'heure locale d'Angers.
-- Les TIMESTAMPTZ restent des instants absolus ;
-- ce réglage définit leur représentation par défaut.

ALTER DATABASE atelier_solidaire
SET timezone TO 'Europe/Paris';

SET TIME ZONE 'Europe/Paris';