# Excel → JSON

Application web React qui convertit un fichier Excel en JSON, permet de modifier la structure de ce JSON, de l'envoyer à une API pour la tester, et de le visualiser sous forme de graphe ou de schéma de base de données.

Cas d'usage typique : vous avez des données dans un tableur et une API REST qui attend un format JSON précis (par exemple `{ nom, adresse: { ville, cp } }`). L'application fait la conversion, la restructuration et l'envoi sans écrire de code.

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
Les pages ci-dessus sont protégées. La connexion se fait par JWT auprès d'un **backend séparé (non inclus dans ce dépôt)**. Ce backend doit exposer :

| Méthode | Route | Corps / en-têtes | Réponse attendue |
|---|---|---|---|
| `POST` | `/register` | `{ username, email, pwd }` | 2xx si le compte est créé |
| `POST` | `/login` | `{ email, pwd }` | `{ auth: true, token }` ou `{ auth: false, message }` |
| `GET` | `/isUserAuth` | en-tête `x-access-token` | `{ auth: true }` si le token est valide |

Le token est stocké dans `localStorage`.

## Langues

L'interface est disponible en **anglais**, **français** et **arabe** (avec affichage de droite à gauche), grâce à [i18next](https://www.i18next.com/) et [react-i18next](https://react.i18next.com/).

- La langue est détectée depuis le navigateur, puis mémorisée (`localStorage`, clé `lang`) quand on la change avec le sélecteur de la barre de navigation, de l'accueil ou de la page de connexion.
- En arabe, `<html dir="rtl">` est appliqué et Bootstrap est remplacé par sa version RTL. Les diagrammes, le code et les champs JSON / SQL / URL restent de gauche à droite.
- Les textes sont dans `src/i18n/locales/<langue>.json`. Les nombres utilisent les formes plurielles d'i18next (`_one`, `_other`, et pour l'arabe `_zero`, `_one`, `_two`, `_few`, `_many`, `_other`).
- Un test (`src/i18n/locales.test.js`) vérifie que toutes les langues ont les mêmes clés, les bonnes formes plurielles et les mêmes variables, et que chaque clé utilisée dans le code existe.

Pour ajouter une langue : créer `src/i18n/locales/<code>.json` en copiant `en.json`, puis l'ajouter à `LANGUAGES` et à `resources` dans `src/i18n/index.js` (et à `PLURAL_FORMS` dans le test).

## Structure du code

```
src/
├── App.js                      # Routes (publiques / protégées) et état partagé du corps de requête
├── config.js                   # URL du backend (REACT_APP_API_URL)
├── i18n/                       # Configuration i18next et traductions (en, fr, ar)
├── home/Home.jsx               # Page d'accueil
├── utils/                      # Logique pure, testée (*.test.js)
│   ├── jsonGraph.js            # JSON -> nœuds et liens React Flow
│   ├── layout.js               # Placement automatique (dagre)
│   ├── schemaInference.js      # JSON -> tables, colonnes, clés
│   ├── sqlParser.js            # CREATE TABLE -> schéma
│   ├── sqlGenerator.js         # Schéma -> SQL (4 dialectes) et Mermaid
│   ├── excelExport.js          # JSON / tables -> fichier Excel
│   └── useSessionState.js      # État conservé au rechargement
└── Components/
    ├── CommanFunctions.js      # Utilitaires : renommage récursif des clés, validation, useAuth…
    ├── RequireAuth.jsx         # Garde des routes protégées + vérification du token
    ├── MainPage.jsx            # Page Excel → JSON
    ├── ModifyJsonStructureComp.jsx  # Page import JSON
    ├── Drag&Drop/              # Zones de dépôt Excel et JSON
    ├── tabaleData/             # Tableau des données Excel
    ├── JsonStructure/          # Éditeur de structure (regrouper, renommer, annuler)
    ├── Popup/DisplayJson.jsx   # Aperçu JSON coloré
    ├── apiRequests/            # Client HTTP (méthode, en-têtes, corps, réponse)
    ├── Flow/                   # Composants React Flow : graphe JSON, diagramme de tables, export PNG
    ├── Visualizer/             # Page /visualizer (onglets, chargement des données, export)
    └── Login/                  # Formulaires de connexion et d'inscription
```

## Démarrage

Prérequis : Node.js 18 ou plus, et le backend d'authentification lancé.

```bash
npm install
cp .env.example .env   # à adapter si le backend n'est pas sur http://localhost:5000
npm start              # http://localhost:3000
```

Autres scripts :
- `npm run build` : build de production dans `build/`
- `npm test` : lance les tests (logique du graphe, déduction du schéma, parseur et générateur SQL)

## Docker

L'image construit l'application puis la sert avec nginx :

```bash
docker build --build-arg REACT_APP_API_URL=http://localhost:5000 -t excel-to-json .
docker run -p 8080:80 excel-to-json   # http://localhost:8080
```

`REACT_APP_API_URL` est intégrée au moment du build : il faut reconstruire l'image pour la changer.
