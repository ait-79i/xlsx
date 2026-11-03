# XLSX : Excel → JSON (Next.js)

Application web **Next.js** (frontend et backend dans le même projet) qui convertit un fichier Excel en JSON, restructure ce JSON, l’envoie à une API pour la tester et le visualise sous forme de graphe ou de schéma de base de données.

Cas d’usage typique : vos données sont dans un tableur et une API REST attend un format JSON précis (par exemple `{ nom, adresse: { ville, cp } }`). L’application fait la conversion, la restructuration et l’envoi sans écrire de code, et retient la structure pour le fichier du mois suivant.

Les fichiers sont lus dans le navigateur et ne sont jamais envoyés au serveur. La base de données ne contient que les comptes et ce que l’utilisateur choisit d’enregistrer (structures, requêtes, messages de contact).

## Fonctionnalités

### 1. Excel → JSON (`/excel-to-json`)
- Fichiers `.xlsx`, `.xlsm`, `.xlsb`, `.xls`, `.xlam`, `.csv` et `.ods`, glissés n’importe où sur la page ou choisis sur l’ordinateur ; données d’exemple pour essayer.
- **Toutes les feuilles** du classeur, en onglets. Les lignes vides sont ignorées, les dates deviennent `2024-03-01`, les en-têtes vides ou en double reçoivent un nom unique.
- **Ligne d’en-tête** : détectée automatiquement (un titre ou des notes au-dessus du tableau sont ignorés) et modifiable.
- La feuille affiche, au-dessus de chaque colonne, la **clé JSON** qu’elle devient (`adresse.ville`).
- **Clés** : renommer, regrouper dans un objet, sortir d’un groupe, dégrouper, réordonner, exclure, **concaténer** plusieurs colonnes en une clé (ordre et séparateur au choix, aperçu en direct).
- **Type de chaque clé** : tel quel, texte, nombre, entier, vrai/faux, date. Les valeurs non convertibles sont signalées (elles deviennent `null`). `1 234,5`, `oui`/`non` et `31/12/2024` sont reconnus.
- Cellules vides : `null`, clé omise ou texte vide. Résultat sous forme de liste, ou d’objet `{ "clé": [ … ] }`.
- **Annuler** (Ctrl+Z) et réinitialiser. Le travail est conservé au rechargement de la page.
- **Structures enregistrées** : la structure (clés, types, options) est enregistrée dans le compte et réappliquée à un nouveau fichier. Les colonnes sont retrouvées par leur en-tête, même déplacées ; les colonnes absentes et nouvelles sont signalées.
- Aperçu JSON, **graphe** et **tables** (React Flow) ; copie ; téléchargement en JSON, **JSON Lines**, **CSV** ou Excel ; envoi vers *Test API* ou le visualiseur.

### 2. Structure JSON (`/json-structure`)
- JSON ouvert depuis un fichier `.json` ou collé (erreur indiquée par ligne et colonne). Tableau d’objets ou objet seul.
- Mêmes outils que le convertisseur (clés, types, concaténation, annuler, structures enregistrées, formats).
- Chaque clé déplacée ou renommée indique son origine (« depuis client.ville ») ; une clé présente dans une partie des objets seulement est signalée (« dans 1 sur 3 »).
- Onglets Résultat, Original et Graphe pour comparer avant et après.

### 3. Test d’API (`/test-api`)
- Ligne de requête (méthode, URL, Envoyer ; Ctrl+Entrée), corps JSON validé avec la ligne de l’erreur, en-têtes activables, authentification Bearer ou Basic (jamais enregistrée).
- Réponse : statut, durée, taille, corps mis en forme, en-têtes ; copie, téléchargement, ouverture dans le visualiseur ; copie de la requête en cURL.
- **Une requête par élément** : chaque objet d’un tableau est envoyé dans sa propre requête, avec des marqueurs dans l’URL (`/clients/{{id}}`). Progression, envois simultanés (1 à 8), arrêt, résultat par ligne avec le message de l’API, renvoi des échecs, rapport CSV.
- **Envoi depuis le serveur XLSX** pour les API qui refusent les appels d’un navigateur (CORS) : utilisateurs connectés seulement, adresses publiques seulement (pas de localhost ni de réseau privé), redirections non suivies, 30 s et 5 Mo au plus, 120 requêtes par minute.
- **Requêtes enregistrées** dans le compte et requêtes récentes.

### 4. Visualiseur (`/visualizer`)
Graphe JSON, schéma de base de données déduit des données ou d’un SQL `CREATE TABLE`, génération SQL (PostgreSQL, MySQL, SQLite, SQL Server), Mermaid et Excel, export PNG.

### 5. Compte (`/account`) et contact (`/support`)
- Modifier le nom et l’e-mail, changer le mot de passe (les autres sessions sont déconnectées), voir ce qui est enregistré, supprimer le compte et toutes ses données.
- Formulaire de contact (sujet, message), prérempli pour un utilisateur connecté, protégé contre le spam ; les messages sont enregistrés dans la table `contact_messages`.

## Sécurité

- Mots de passe hachés avec bcrypt. Session : JWT (HS256, `JWT_SECRET`) dans un cookie **httpOnly** `token`.
- Le middleware (`src/middleware.js`) vérifie la signature et redirige vers `/login?next=…` ; après connexion, l’utilisateur revient sur la page demandée (chemins du site uniquement).
- Les pages et les routes API vérifient aussi l’utilisateur en base (`src/lib/auth.js`) : un compte supprimé ou une session antérieure au dernier changement de mot de passe (`session_version`) n’est plus accepté.
- Limites de fréquence (`src/lib/rateLimit.js`) : connexion (par adresse et par compte), inscription, contact, changement de mot de passe, envoi depuis le serveur. Elles sont gardées en mémoire : avec plusieurs instances, utiliser un stockage partagé.
- Chaque donnée enregistrée appartient à un utilisateur ; les routes ne lisent et ne suppriment que celles de l’utilisateur connecté.

## Routes API

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/auth/register` | Créer un compte `{ username, email, pwd }` |
| `POST` | `/api/auth/login` | Connexion `{ email, pwd }` ; `429` après trop d’essais |
| `POST` | `/api/auth/logout` | Déconnexion |
| `GET` | `/api/auth/me` | Utilisateur connecté |
| `GET` `PATCH` `DELETE` | `/api/account` | Profil ; modifier `{ username, email }` ; supprimer `{ password }` |
| `POST` | `/api/account/password` | `{ current, next }` |
| `GET` `POST` | `/api/mappings?kind=sheet\|json` | Structures enregistrées ; `{ kind, name, data, overwrite }` (`409` si le nom existe) |
| `DELETE` | `/api/mappings/:id` | Supprimer une structure |
| `GET` `POST` | `/api/requests` | Requêtes enregistrées ; `{ name, method, url, headers, body, overwrite }` |
| `DELETE` | `/api/requests/:id` | Supprimer une requête |
| `POST` | `/api/contact` | `{ name, email, topic, message }` |
| `POST` | `/api/proxy` | Envoi depuis le serveur `{ method, url, headers, body }` |

## Langues

Anglais, français et arabe (de droite à gauche), avec [i18next](https://www.i18next.com/). La langue vient du cookie `lang`, sinon de l’en-tête `Accept-Language`. Les textes sont dans `src/i18n/locales/<langue>.json` ; un test vérifie que toutes les langues ont les mêmes clés, les bonnes formes plurielles et les mêmes variables, et que chaque clé utilisée dans le code existe.

Pour ajouter une langue : créer `src/i18n/locales/<code>.json` en copiant `en.json`, puis l’ajouter à `LANGUAGES` dans `src/i18n/settings.js`, à `resources` dans `src/i18n/index.js` et à `PLURAL_FORMS` dans le test.

## Structure du code

```
prisma/
├── schema.prisma               # User, Mapping, SavedRequest, ContactMessage
└── migrations/
src/
├── middleware.js               # Protection des pages (signature du JWT)
├── lib/                        # Serveur : auth, session, prisma, rateLimit, ssrf, validate, redirect
├── app/                        # Routes Next.js (App Router)
│   ├── (protected)/            # excel-to-json, json-structure, test-api, visualizer, account
│   ├── login/ support/         # Pages publiques
│   └── api/                    # auth, account, mappings, requests, contact, proxy
├── utils/                      # Logique pure et testée : converter, reshape, output, batch, http, schéma, SQL…
├── Components/
│   ├── Converter/              # Excel → JSON, et composants partagés (clés, concaténation, actions, structures)
│   ├── Reshape/                # Structure JSON
│   ├── ApiTester/              # Test d’API, envoi par élément, requêtes enregistrées
│   ├── Account/                # Compte
│   ├── Flow/ Visualizer/       # Graphe et schéma (React Flow)
│   └── Login/ Navbar …
├── home/                       # Page d’accueil
└── i18n/                       # Langues et traductions
```

## Démarrage

Prérequis : Node.js 18.18 ou plus, et Docker (pour PostgreSQL) ou un serveur PostgreSQL.

```bash
npm install
cp .env.example .env          # puis remplir JWT_SECRET (et DATABASE_URL si besoin)
docker compose up -d db       # PostgreSQL sur localhost:5432
npm run db:migrate            # crée les tables
npm run dev                   # http://localhost:3000
```

Autres scripts :
- `npm run build` puis `npm start` : build et serveur de production
- `npm test` : tests (conversion, types, structures, concaténation, envoi par élément, HTTP, limites, graphe, schéma, SQL, traductions)
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

`JWT_SECRET` est lu depuis le fichier `.env`. Derrière un proxy inverse, transmettre l’en-tête `X-Forwarded-For` : il sert aux limites de fréquence.
