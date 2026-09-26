# Atelier Solidaire

## Présentation

Atelier Solidaire est une application web responsive de réservation et de gestion d'ateliers solidaires.

Le projet est réalisé dans le cadre d'une formation **DWWM** (Développeur Web et Web Mobile), sous la forme d'une **situation professionnelle simulée** pour une **association fictive**.

Le dépôt sépare le Front, l'API Backend et la base de données PostgreSQL.

## Stack technique

### Front

- Vue 3
- TypeScript
- Vue Router
- Pinia
- Vite
- CSS natif et variables CSS
- Vitest
- Vue Test Utils
- ESLint
- Prettier

### API

- Node.js
- TypeScript
- Express 5
- PostgreSQL via `pg`
- Zod
- CORS
- dotenv
- tsx
- Vitest

### Base de données

- PostgreSQL 16
- migrations SQL versionnées
- données de démonstration
- Docker Compose
- scripts de sauvegarde, restauration et création d'une base de test

### Outillage

- NVM
- npm
- Docker Desktop / Docker Compose
- TypeScript
- ESLint
- Prettier
- Vitest

## Structure du dépôt

```text
.
├── apps/
│   ├── front/          # Application Vue
│   └── api/            # API Express / TypeScript
├── database/
│   ├── compose.yml     # PostgreSQL local
│   ├── migrations/     # Migrations SQL et données de démonstration
│   ├── scripts/        # Sauvegarde, restauration et base de test
│   └── docs/           # Documentation du modèle de données
└── docs/
    ├── adr/            # Architecture Decision Records
    └── production-exploitation.md
```

## Prérequis

L'environnement prévu pour le projet repose sur :

- **WSL 2 / Ubuntu** ;
- **NVM** ;
- **Node.js 24.19.0**, version fixée par le fichier `.nvmrc` ;
- **Docker Desktop** avec Docker Compose.

## Installation

Installer les dépendances npm séparément dans le Front et l'API.

### Front

Depuis `apps/front` :

```sh
npm install
```

### API

Depuis `apps/api` :

```sh
npm install
```

## Lancement

### Base PostgreSQL

Le service PostgreSQL est défini dans `database/compose.yml`.

Depuis la racine du dépôt :

```sh
docker compose -f database/compose.yml up -d
```

La configuration fournie utilise :

- base : `atelier_solidaire` ;
- utilisateur : `atelier` ;
- mot de passe de développement : `atelier_dev` ;
- port exposé sur l'hôte : `5433`.

Les migrations se trouvent dans `database/migrations/` et doivent être appliquées dans l'ordre :

```sh
docker compose -f database/compose.yml exec -T postgres psql -U atelier -d atelier_solidaire < database/migrations/001_schema.sql
docker compose -f database/compose.yml exec -T postgres psql -U atelier -d atelier_solidaire < database/migrations/002_seed.sql
docker compose -f database/compose.yml exec -T postgres psql -U atelier -d atelier_solidaire < database/migrations/003_timezone.sql
docker compose -f database/compose.yml exec -T postgres psql -U atelier -d atelier_solidaire < database/migrations/004_backend_demo.sql
docker compose -f database/compose.yml exec -T postgres psql -U atelier -d atelier_solidaire < database/migrations/005_test_scenarios.sql
```

#### Scripts de base de données

Les scripts suivants doivent être lancés depuis la racine du dépôt.

Créer une sauvegarde PostgreSQL au format custom dans `database/backups/` :

```sh
./database/scripts/backup.sh
```

Restaurer un dump dans `atelier_solidaire_restore`, ou dans une base cible fournie en second argument :

```sh
./database/scripts/restore.sh database/backups/atelier_solidaire_AAAAMMJJ-HHMM.dump
./database/scripts/restore.sh database/backups/atelier_solidaire_AAAAMMJJ-HHMM.dump autre_base
```

Recréer `atelier_solidaire_test` et y appliquer les migrations 001 à 005 :

```sh
./database/scripts/create-test-db.sh
```

Le répertoire `database/backups/` est ignoré par Git car les dumps peuvent contenir des données personnelles.

### API

Les variables d'environnement attendues sont documentées dans `apps/api/.env.example` :

```dotenv
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
FRONTEND_ORIGIN=http://localhost:5173
```

Avec le PostgreSQL défini dans `database/compose.yml`, une valeur locale cohérente pour `DATABASE_URL` est :

```dotenv
DATABASE_URL=postgresql://atelier:atelier_dev@localhost:5433/atelier_solidaire
```

Le fichier réel `apps/api/.env` n'est pas versionné.

Depuis `apps/api` :

#### Développement

```sh
npm run dev
```

#### Vérification de types et build

```sh
npm run type-check
npm run build
```

#### Démarrage du build

```sh
npm start
```

Le code TypeScript compilé est exécuté depuis `dist/server.js`.

Une fois l'API démarrée, l'endpoint suivant vérifie son fonctionnement et sa connexion à PostgreSQL :

```text
GET http://localhost:3000/api/health
```

### Front

Le Front utilise les variables documentées dans `apps/front/.env.example` :

```dotenv
VITE_API_URL=http://localhost:3000
VITE_WORKSHOP_ID=2
```

`VITE_API_URL` indique l'adresse de l'API et `VITE_WORKSHOP_ID` sélectionne l'atelier de démonstration chargé par le parcours de réservation. Le fichier local `apps/front/.env` est ignoré par Git.

Depuis `apps/front`, créer la configuration locale à partir de l'exemple :

```sh
cp .env.example .env
```

L'API doit être démarrée avant le Front pour charger l'atelier, les disponibilités et enregistrer une réservation.

#### Développement

```sh
npm run dev
```

#### Build

```sh
npm run build
```

#### Preview

```sh
npm run preview -- --host 127.0.0.1 --port 4173
```

Le build Vite est généré dans `dist/`.

## Qualité et tests

### Front

Depuis `apps/front` :

```sh
npm run lint
npm run type-check
npm run test:unit
```

Le script `lint` exécute ESLint avec correction automatique et cache.

### API

Depuis `apps/api` :

```sh
npm run type-check
npm test
```

Aucun script `lint` n'est défini dans `apps/api/package.json`.

## Documentation

- [Préparation à la mise en production et exploitation](docs/production-exploitation.md)
- [Architecture Decision Records](docs/adr/)
- [Modèle de données](database/docs/model.md)

## État du projet

### Réalisé

- Front Vue avec navigation SPA et chargement différé des vues de réservation ;
- parcours participant en plusieurs étapes : accueil, atelier, choix d'un créneau, informations participant, vérification et confirmation de la réservation ;
- Front raccordé à l'API pour charger l'atelier et les disponibilités puis créer une réservation ;
- gestion côté Front des états de chargement, des créneaux complets et des erreurs de réservation renvoyées par l'API ;
- la catégorie « Je ne sais pas / autre » reste un parcours de préqualification et ne crée pas de réservation ;
- état de réservation partagé côté Front avec Pinia ;
- schéma PostgreSQL pour les ateliers, créneaux, catégories, bénévoles, affectations, réservations et demandes de préqualification ;
- migrations SQL et données de démonstration ;
- scripts locaux de sauvegarde, restauration et création d'une base de test PostgreSQL ;
- API Express avec :
  - `GET /api/health` ;
  - `GET /api/workshops/:id/availability` ;
  - `POST /api/reservations` ;
- validation des données de réservation avec Zod ;
- contrôle de disponibilité, de capacité et de fermeture des réservations côté API ;
- configuration CORS via `FRONTEND_ORIGIN` ;
- documentation de préparation à la production ;
- ADR documentant le choix de la stack Front.

### Pas encore réalisé ou raccordé

D'après le code et la documentation actuellement versionnés :

- l'application complète n'est pas encore déployée publiquement ;
- HTTPS, la supervision, l'automatisation et l'externalisation des sauvegardes, ainsi que le redémarrage automatique restent à mettre en œuvre pour un déploiement réel ;
- les interfaces dédiées aux bénévoles et à la coordination ne sont pas présentes dans les vues Front actuelles.
