# Modèle relationnel — Atelier Solidaire

## Objectif

La base de données PostgreSQL conserve les informations nécessaires à
l'organisation des ateliers, aux capacités par catégorie, aux affectations
des bénévoles et aux réservations des participants.

Elle sépare volontairement :

- les compétences d'un bénévole ;
- son affectation effective à un créneau ;
- les demandes nécessitant une préqualification ;
- les réservations réellement rattachées à une catégorie et à un créneau.

## Entités principales

### workshops

Représente un atelier organisé à une date et dans un lieu précis.

Un atelier possède plusieurs créneaux d'arrivée.

### arrival_slots

Représente une heure d'arrivée et de première prise en charge.

Un créneau n'est pas une durée de réparation garantie.

### categories

Contient les catégories réservables :

- Informatique ;
- Petit électroménager ;
- Couture & textile.

Chaque catégorie possède une unité de capacité exprimée en minutes.

### slot_categories

Association entre un créneau et les catégories ouvertes sur ce créneau.

### volunteers

Contient les bénévoles pouvant participer aux ateliers.

### volunteer_skills

Association entre les bénévoles et leurs compétences.

Un bénévole peut posséder plusieurs compétences.

### volunteer_slot_assignments

Représente l'affectation réelle d'un bénévole à une catégorie sur un créneau.

La clé primaire `(volunteer_id, slot_id)` empêche qu'un même bénévole
soit compté plusieurs fois sur le même créneau, même s'il possède plusieurs
compétences.

### reservations

Contient les réservations rattachées à un créneau et à une catégorie.

Les informations participant sont stockées avec la réservation afin de ne
pas imposer la création d'un compte utilisateur permanent.

Un UUID public distinct de l'identifiant technique est généré pour permettre
ultérieurement l'accès sécurisé à une réservation depuis le Backend.

### prequalification_requests

Contient les demandes « Je ne sais pas / autre ».

Ces demandes ne sont pas considérées immédiatement comme des réservations :
elles doivent d'abord être examinées par l'association.

## Relations

```mermaid
erDiagram
    WORKSHOPS ||--o{ ARRIVAL_SLOTS : contient
    ARRIVAL_SLOTS ||--o{ SLOT_CATEGORIES : propose
    CATEGORIES ||--o{ SLOT_CATEGORIES : concerne

    VOLUNTEERS ||--o{ VOLUNTEER_SKILLS : possede
    CATEGORIES ||--o{ VOLUNTEER_SKILLS : qualifie

    VOLUNTEERS ||--o{ VOLUNTEER_SLOT_ASSIGNMENTS : est_affecte
    ARRIVAL_SLOTS ||--o{ VOLUNTEER_SLOT_ASSIGNMENTS : accueille
    CATEGORIES ||--o{ VOLUNTEER_SLOT_ASSIGNMENTS : mobilise

    SLOT_CATEGORIES ||--o{ RESERVATIONS : recoit

    WORKSHOPS ||--o{ PREQUALIFICATION_REQUESTS : recoit
    PREQUALIFICATION_REQUESTS o|--o| RESERVATIONS : peut_devenir