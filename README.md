# Atelier Solidaire

## Présentation

Atelier Solidaire est une application web responsive de réservation et de gestion d'ateliers solidaires.

Le projet est réalisé dans le cadre d'une formation **DWWM** (Développeur Web et Web Mobile), sous la forme d'une **situation professionnelle simulée** pour une **association fictive**.

Le dépôt sépare le Front, l'API Backend, la base transactionnelle PostgreSQL et le journal de tentatives MongoDB.

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
- MongoDB via le driver officiel `mongodb`
- Zod
- CORS
- Helmet
- dotenv
- tsx
- Vitest
- Supertest

### Base de données

- PostgreSQL 16 pour les données transactionnelles
- MongoDB 8 pour le journal anonymisé des tentatives de réservation
- migrations SQL versionnées
- données de démonstration
- Docker Compose
- scripts de sauvegarde, restauration et création d'une base de test PostgreSQL

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
│   ├── compose.yml     # PostgreSQL et MongoDB locaux
│   ├── migrations/     # Migrations SQL et données de démonstration
│   ├── mongo/init/     # Initialisation du journal MongoDB
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

### Bases de données

Les services PostgreSQL et MongoDB sont définis dans `database/compose.yml`. Les ports locaux sont publiés uniquement sur l'interface de boucle locale.

Depuis la racine du dépôt :

```sh
docker compose -f database/compose.yml up -d
```

La configuration PostgreSQL fournie utilise :

- base : `atelier_solidaire` ;
- utilisateur : `atelier` ;
- mot de passe de développement : `atelier_dev` ;
- port local : `127.0.0.1:5433`.

MongoDB écoute localement sur `127.0.0.1:27017`. Son script d'initialisation crée les bases de logs, leur validateur strict, les index statistiques/TTL et l'utilisateur applicatif limité en lecture/écriture à ces deux bases.

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
MONGODB_URL=mongodb://atelier_logs:atelier_logs_dev@localhost:27017/atelier_solidaire_logs?authSource=admin
ADMIN_API_TOKEN=0123456789abcdef0123456789abcdef
```

Avec le PostgreSQL défini dans `database/compose.yml`, une valeur locale cohérente pour `DATABASE_URL` est :

```dotenv
DATABASE_URL=postgresql://atelier:atelier_dev@localhost:5433/atelier_solidaire
```

Le fichier réel `apps/api/.env` n'est pas versionné. Le jeton administrateur doit contenir au moins 32 caractères ; une valeur aléatoire peut être générée avec :

```sh
openssl rand -hex 32
```

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

Une fois l'API démarrée, l'endpoint suivant indique séparément l'état de PostgreSQL et de MongoDB :

```text
GET http://localhost:3000/api/health
```

MongoDB est utilisé uniquement pour les statistiques de tentatives. Une indisponibilité MongoDB n'empêche pas l'API de démarrer ni PostgreSQL d'accepter une réservation.

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

Les tests d'intégration nécessitent PostgreSQL et MongoDB démarrés. Recréer d'abord la base PostgreSQL de test depuis la racine :

```sh
docker compose -f database/compose.yml up -d
./database/scripts/create-test-db.sh
```

Puis, depuis `apps/api` :

```sh
npm run lint
npm run type-check
npm run test:unit
npm run test:integration
npm test
```

`npm test` exécute les suites unitaires puis les tests d'intégration. Les tests d'intégration refusent de s'exécuter si les noms des bases PostgreSQL et MongoDB ne se terminent pas par `_test`.

## Documentation

- [Contrat OpenAPI 3.1](docs/api/openapi.yaml)
- [Préparation à la mise en production et exploitation](docs/production-exploitation.md)
- [Architecture Decision Records](docs/adr/)
- [Architecture API en couches](docs/adr/0002-api-layered-architecture.md)
- [Journal MongoDB des tentatives](docs/adr/0003-mongodb-reservation-attempts.md)
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
- API Express structurée en couches HTTP, services métier et repositories avec injection de dépendances ;
- API Express avec :
  - `GET /api/health` ;
  - `GET /api/workshops/:id/availability` ;
  - `POST /api/reservations` ;
  - `GET /api/admin/stats/reservation-attempts?workshopId=<id>`, protégée par jeton administrateur ;
- validation des données et de la configuration avec Zod ;
- contrôle de disponibilité, de capacité et de fermeture des réservations côté API ;
- verrou PostgreSQL pour sérialiser les réservations concurrentes sur un même créneau/catégorie ;
- journal MongoDB sans données personnelles avec rétention TTL de 180 jours ;
- configuration CORS stricte via `FRONTEND_ORIGIN` et en-têtes de sécurité Helmet ;
- documentation de préparation à la production ;
- ADR documentant le choix de la stack Front.

### Pas encore réalisé ou raccordé

D'après le code et la documentation actuellement versionnés :

- l'application complète n'est pas encore déployée publiquement ;
- HTTPS, la supervision, l'automatisation et l'externalisation des sauvegardes, ainsi que le redémarrage automatique restent à mettre en œuvre pour un déploiement réel ;
- les interfaces dédiées aux bénévoles et à la coordination ne sont pas présentes dans les vues Front actuelles.
