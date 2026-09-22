# ADR-001 — Stack Front d’Atelier Solidaire

- **Statut** : Accepté
- **Date** : 2026-09-20
- **Issue Linear** : AMI-59 — Choisir et justifier la stack Front

## Contexte

Atelier Solidaire est une application web responsive de réservation et de gestion d’ateliers solidaires.

Le Front doit couvrir notamment :

- un parcours participant multi-étapes ;
- des formulaires, validations et retours sans perte des saisies ;
- une navigation SPA avec deep links ;
- des états de chargement, erreurs, conflits et revalidation de données serveur ;
- des interfaces bénévole et coordinatrice fortement interactives ;
- un responsive réel et une accessibilité correcte ;
- une communication avec un Backend métier séparé via une API explicite.

L’architecture retenue avant le choix de technologie est la suivante :

- navigation applicative de type SPA ;
- rendu principalement côté client (CSR) pour les zones interactives ;
- SSG possible pour du contenu public stable ;
- SSR non retenu pour la V1 ;
- Front séparé de l’API, du Backend métier et de la BDD.

Le projet est individuel et doit rester lisible, maintenable, testable, documentable et proportionné.

## Contraintes structurantes

La décision doit respecter les principes suivants :

- besoin → contrainte → critère → technologie ;
- ne pas ajouter de dépendance sans problème réel à résoudre ;
- conserver une architecture explicite ;
- garder HTML, CSS et JavaScript/TypeScript suffisamment visibles ;
- ne pas déplacer les règles métier autoritaires dans le Front ;
- permettre les tests sans infrastructure disproportionnée ;
- conserver un build et un déploiement simples ;
- différer les décisions non nécessaires.

## Options étudiées

### React

**Forces**

- maturité et écosystème très importants ;
- excellent support TypeScript et tests ;
- très adapté aux interfaces composées et dynamiques.

**Limites dans ce projet**

- le modèle de rendu, d’état et d’effets ajoute une couche conceptuelle React importante ;
- l’application complète nécessite plusieurs décisions d’assemblage autour de React ;
- aucun besoin d’Atelier Solidaire ne rend React spécifiquement préférable aux autres candidats.

### Svelte / SvelteKit

**Forces**

- syntaxe concise et proximité forte avec HTML/CSS/JavaScript ;
- très bonne réactivité ;
- excellent support d’architectures hybrides, avec prerendering, CSR et SSR configurables.

**Limites dans ce projet**

- l’hybridation SSG/SSR n’est pas le besoin dominant de la V1 ;
- SvelteKit introduit des capacités serveur Front qui ne sont pas nécessaires à la séparation retenue Front → API → Backend ;
- écosystème plus réduit que Vue et React.

### Vue 3

**Forces**

- très adapté aux SPA principalement CSR ;
- modèle de composants et réactivité cohérents avec les formulaires et états d’Atelier Solidaire ;
- Single-File Components gardant structure, logique et styles lisibles ;
- Vue Router fournit une solution officielle et explicite pour le routing SPA ;
- très bon support TypeScript ;
- écosystème mature ;
- faible complexité accidentelle pour l’architecture retenue.

**Limite principale**

- le SSG hybride route par route est moins directement intégré qu’avec un framework complet comme Nuxt ou SvelteKit.

Cette limite est acceptée car le SSG est une possibilité, pas une exigence centrale de la V1.

## Décision

La stack Front retenue est :

### Runtime

- **Vue 3** — composants et réactivité ;
- **TypeScript** — typage du code, des composants et des contrats manipulés côté Front ;
- **Vue Router** — routing SPA, paramètres, deep links et navigation ;
- **Pinia** — état client partagé lorsque plusieurs étapes ou vues doivent conserver des données communes.

### Build et développement

- **Vite** — serveur de développement et build ;
- **ESLint** — analyse statique ;
- **Prettier** — formatage automatique.

### Styles

- **CSS natif** ;
- **variables CSS** pour traduire les design tokens issus de Figma ;
- styles globaux limités aux fondations ;
- styles locaux via **`<style scoped>`** dans les composants Vue.

### Tests

- **Vitest** — tests unitaires et de logique ;
- **Vue Test Utils** — tests de composants Vue.

## Dépendances non retenues au départ

Les éléments suivants ne sont pas ajoutés par défaut :

- Axios : `fetch` natif suffit tant qu’aucun besoin supplémentaire n’apparaît ;
- VeeValidate / Zod : validation native et logique explicite d’abord ;
- TanStack Query ou équivalent : revalidation et états serveur implémentés explicitement avant d’ajouter une abstraction ;
- bibliothèque de dates : `Date` et `Intl` d’abord ;
- Tailwind CSS ou bibliothèque UI : le UI Kit Figma est traduit en CSS natif ;
- bibliothèque d’icônes : SVG/assets ciblés si nécessaire ;
- outil E2E : décision différée jusqu’à l’existence d’un parcours complet à tester.

## Conséquences

### Positives

- architecture Front simple à lire ;
- séparation nette entre navigation, état UI, API et Backend métier ;
- peu de dépendances initiales ;
- TypeScript facilite les refactorings et explicite les structures manipulées ;
- CSS natif permet de démontrer réellement les compétences responsive et accessibilité ;
- Vue Router et Pinia couvrent les besoins applicatifs sans imposer un framework full-stack.

### Coûts acceptés

- les développeurs doivent apprendre les concepts Vue : refs/réactivité, Composition API, composants et directives ;
- l’absence de bibliothèque de données serveur implique au départ une gestion explicite des états loading/error/revalidation ;
- le SSG demandera une décision complémentaire si ce besoin devient réellement obligatoire.

## Risques et garde-fous

- **Risque : état global excessif.**  
  Pinia ne doit pas devenir un stockage universel. L’état reste local lorsqu’il n’a pas besoin d’être partagé.

- **Risque : duplication de règles métier.**  
  Le Front peut guider l’utilisateur, mais les règles critiques restent garanties côté Backend.

- **Risque : confiance excessive dans TypeScript.**  
  TypeScript n’est pas une validation runtime. Les données externes restent à vérifier aux frontières.

- **Risque : ajout progressif de dépendances par habitude.**  
  Toute nouvelle dépendance doit répondre à un problème réel observé.

## Décisions différées

Ne sont pas décidés dans AMI-59 :

- framework Backend ;
- SGBD ;
- hébergement ;
- style d’API détaillé (REST, GraphQL, RPC) ;
- stratégie SSG définitive ;
- outil E2E ;
- éventuelle bibliothèque avancée de validation ou de données serveur.

Ces choix seront faits au moment où un besoin réel du projet les rend nécessaires.

## Résultat

La V1 Front part donc sur :

```text
Vue 3
+ TypeScript
+ Vite
+ Vue Router
+ Pinia
+ CSS natif / variables CSS / styles scoped
+ ESLint
+ Prettier
+ Vitest
+ Vue Test Utils
```

Cette décision privilégie une SPA CSR explicite, un Front séparé du Backend métier et une complexité proportionnée aux besoins d’Atelier Solidaire.
