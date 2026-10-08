# Excel → JSON (Next.js)

Application web **Next.js** (frontend et backend dans le même projet) qui convertit un fichier Excel en JSON, permet de modifier la structure de ce JSON, de l’envoyer à une API pour la tester, et de le visualiser sous forme de graphe ou de schéma de base de données.

Cas d’usage typique : vous avez des données dans un tableur et une API REST qui attend un format JSON précis (par exemple `{ nom, adresse: { ville, cp } }`). L’application fait la conversion, la restructuration et l’envoi sans écrire de code.

Réécriture de l’ancienne application React (create-react-app) : mêmes pages et mêmes fonctionnalités, mais l’authentification est maintenant fournie par l’application elle-même (routes API Next.js + PostgreSQL) au lieu d’un backend séparé.

## Fonctionnalités

### 1. Excel → JSON (`/excel-to-json`)
- Glisser-déposer ou sélection d'un fichier `.xlsx`, `.xlsm`, `.xlsb`, `.xls` ou `.xlam`.
- Seule la **première feuille** est lue ([SheetJS](https://sheetjs.com/)). Chaque ligne devient un objet dont les clés sont les en-têtes de colonnes.
- Affichage des données dans un tableau. Un double-clic sur un en-tête permet de renommer la colonne.
- Aperçu du premier objet JSON, copie dans le presse-papiers, téléchargement de `data.json`.

### 2. Restructuration du JSON (`/json-structure`, et aussi dans la page Excel)
- **Regrouper** : cochez des colonnes, donnez un nom de clé, puis cliquez sur *Generate*. Les colonnes cochées sont déplacées dans un sous-objet.
  `{ nom, ville, cp }` → `{ nom, adresse: { ville, cp } }`
- **Renommer** : double-clic sur une clé, puis Entrée ou clic ailleurs pour valider. Le renommage s'applique à tous les objets, y compris aux niveaux imbriqués.
- **Annuler un regroupement** : le bouton ↶ remet une clé imbriquée au premier niveau et supprime les sous-objets devenus vides.
- La page `/json-structure` fait la même chose à partir d'un fichier `.json` importé.

### 3. Test d'API (`/test-api`)
- Choix de la méthode (GET, POST, PUT, PATCH, DELETE) et de l'URL.
- En-têtes modifiables : seuls les en-têtes cochés sont envoyés.
- Corps de la requête pré-rempli avec le JSON généré (bouton *Send data*) et modifiable dans un éditeur avec validation JSON.
- Affichage de la réponse ou de l'erreur.

### 4. Visualiseur (`/visualizer`)
Page construite avec [React Flow (xyflow)](https://reactflow.dev/). Les données viennent des boutons **Visualize** des pages *Excel to json*, *json structure* et *Test API* (réponse de l'API), ou d'un fichier JSON / Excel déposé sur la page, d'un JSON collé ou de l'exemple fourni. Elles sont conservées si la page est rechargée (`sessionStorage`).

- **Graphe JSON** : chaque objet et chaque tableau devient un nœud, relié à son parent. Placement automatique (dagre).
  - Clic sur une clé imbriquée : replier ou déplier la branche. *Collapse all* / *Expand all* pour tout replier ou tout déplier.
  - Clic sur une valeur : copie de son chemin (ex. `$[0].address.city`).
  - Recherche dans les clés et les valeurs, avec navigation entre les résultats (Entrée / Maj+Entrée).
  - Nombre d'éléments affichés par tableau réglable (5 à 100), mini-carte, zoom, export PNG.
- **Schéma de base de données** : diagramme entité-relation.
  - *From the JSON data* : les tables sont déduites des données. Un objet imbriqué donne une table liée en 1:1, un tableau d'objets une table liée en 1:N, un tableau de valeurs une table `<parent>_<clé>`. Types des colonnes, colonnes nullables, clé primaire (`id` réutilisé s'il est entier et unique, sinon ajouté) et clés étrangères `<parent>_id` sont déduits automatiquement.
  - *From SQL* : collez des `CREATE TABLE` (PostgreSQL, MySQL, SQLite, SQL Server) ou ouvrez un fichier `.sql` pour dessiner le schéma d'une base existante. Les clés étrangères déclarées dans la colonne, en contrainte de table ou via `ALTER TABLE ... ADD FOREIGN KEY` sont reconnues.
  - Double-clic sur le nom d'une table pour la renommer, sélecteur pour changer le type d'une colonne, sélection d'une table pour mettre ses relations en évidence, export PNG.
- **SQL & export** :
  - Génération du SQL `CREATE TABLE` (avec les `INSERT` des données si le schéma vient du JSON) pour PostgreSQL, MySQL / MariaDB, SQLite ou SQL Server. Cela permet aussi de convertir un schéma SQL d'une base à l'autre.
  - Export du diagramme au format Mermaid (`erDiagram`), à coller dans GitHub, GitLab ou Notion.
  - Export Excel : une feuille par table, ou le JSON aplati (`adresse.ville`, ...).

Les pages *Excel to json* et *json structure* ont aussi un bouton **Download Excel file** (JSON → Excel).

### Authentification
Les pages *Excel to json*, *json structure*, *Test API* et *Visualiseur* sont protégées. Les comptes sont stockés dans PostgreSQL (table `users`, mots de passe hachés avec bcrypt) via [Prisma](https://www.prisma.io/).

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ username, email, pwd }` | `201` ; `400 { code: "invalidData" }` ; `409 { code: "emailTaken" }` |
| `POST` | `/api/auth/login` | `{ email, pwd }` | `{ auth: true, user }` + cookie de session ; `400` / `401` sinon |
| `POST` | `/api/auth/logout` | – | supprime le cookie |
| `GET` | `/api/auth/me` | – | `{ auth: true, user }` si la session est valide, `401` sinon |

La session est un JWT (HS256, signé avec `JWT_SECRET`) placé dans un cookie **httpOnly** `token` : il n’est plus accessible au JavaScript de la page (contrairement à l’ancien `localStorage`). Le middleware (`src/middleware.js`) redirige vers `/login` les pages protégées sans session valide, et renvoie vers `/` un utilisateur déjà connecté qui ouvre `/login`.

## Langues

L'interface est disponible en **anglais**, **français** et **arabe** (avec affichage de droite à gauche), grâce à [i18next](https://www.i18next.com/) et [react-i18next](https://react.i18next.com/).

- La langue est choisie côté serveur : cookie `lang` s'il existe, sinon l'en-tête `Accept-Language` du navigateur. Elle est mémorisée dans ce cookie quand on la change avec le sélecteur de la barre de navigation, de l'accueil ou de la page de connexion. Le HTML arrive donc directement dans la bonne langue et le bon sens d'écriture.
- En arabe, `<html dir="rtl">` est appliqué et Bootstrap est remplacé par sa version RTL. Les diagrammes, le code et les champs JSON / SQL / URL restent de gauche à droite.
- Les textes sont dans `src/i18n/locales/<langue>.json`. Les nombres utilisent les formes plurielles d'i18next (`_one`, `_other`, et pour l'arabe `_zero`, `_one`, `_two`, `_few`, `_many`, `_other`).
- Un test (`src/i18n/locales.test.js`) vérifie que toutes les langues ont les mêmes clés, les bonnes formes plurielles et les mêmes variables, et que chaque clé utilisée dans le code existe.

Pour ajouter une langue : créer `src/i18n/locales/<code>.json` en copiant `en.json`, puis l'ajouter à `LANGUAGES` dans `src/i18n/settings.js` et à `resources` dans `src/i18n/index.js` (et à `PLURAL_FORMS` dans le test).

## Structure du code

```
prisma/
├── schema.prisma               # Modèle User (table users)
└── migrations/                 # Migrations SQL
src/
├── middleware.js               # Protection des routes (vérifie le JWT du cookie)
├── lib/
│   ├── prisma.js               # Client Prisma
│   └── session.js              # Création / vérification du JWT, options du cookie
├── app/                        # Routes Next.js (App Router)
│   ├── layout.jsx              # <html lang dir>, Bootstrap LTR/RTL, polices, fournisseurs
│   ├── providers.jsx           # i18next + état partagé
│   ├── app-state.jsx           # JSON envoyé à /test-api et données du visualiseur
│   ├── page.jsx                # /  (accueil)
│   ├── login/ support/         # Pages publiques
│   ├── (protected)/            # Pages protégées + barre de navigation
│   │   ├── excel-to-json/ json-structure/ test-api/ visualizer/
│   └── api/auth/               # login, register, logout, me
├── i18n/                       # settings.js (langues, détection), index.js (instance i18next), traductions
├── home/                       # Page d’accueil
├── utils/                      # Logique pure, testée (*.test.js)
└── Components/                 # Composants React (repris de l’ancienne application)
```

## Démarrage

Prérequis : Node.js 18.18 ou plus, et Docker (pour PostgreSQL) ou un serveur PostgreSQL.

```bash
npm install
cp .env.example .env          # puis remplir JWT_SECRET (et DATABASE_URL si besoin)
docker compose up -d db       # PostgreSQL sur localhost:5432
npm run db:migrate            # crée la table users
npm run dev                   # http://localhost:3000
```

Autres scripts :
- `npm run build` puis `npm start` : build et serveur de production
- `npm test` : tests (logique du graphe, déduction du schéma, parseur et générateur SQL, traductions)
- `npm run db:deploy` : applique les migrations en production

### Variables d’environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `JWT_SECRET` | Clé de signature des sessions (obligatoire) |
| `JWT_EXPIRES_IN` | Durée de la session (`1d` par défaut) |
| `COOKIE_SECURE` | `false` pour servir l’application en http hors localhost (le cookie est `Secure` en production par défaut) |

## Docker

`docker-compose.yml` lance PostgreSQL et l’application (build `standalone` de Next.js). Les migrations sont appliquées au démarrage du conteneur.

```bash
docker compose --profile app up -d --build   # http://localhost:3000
APP_PORT=8080 docker compose --profile app up -d --build   # sur un autre port
```

`JWT_SECRET` est lu depuis le fichier `.env`.
