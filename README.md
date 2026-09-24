# Excel → JSON

Application web React qui convertit un fichier Excel en JSON, permet de modifier la structure de ce JSON, puis de l'envoyer à une API pour la tester.

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

### Authentification
Les pages ci-dessus sont protégées. La connexion se fait par JWT auprès d'un **backend séparé (non inclus dans ce dépôt)**. Ce backend doit exposer :

| Méthode | Route | Corps / en-têtes | Réponse attendue |
|---|---|---|---|
| `POST` | `/register` | `{ username, email, pwd }` | 2xx si le compte est créé |
| `POST` | `/login` | `{ email, pwd }` | `{ auth: true, token }` ou `{ auth: false, message }` |
| `GET` | `/isUserAuth` | en-tête `x-access-token` | `{ auth: true }` si le token est valide |

Le token est stocké dans `localStorage`.

## Structure du code

```
src/
├── App.js                      # Routes (publiques / protégées) et état partagé du corps de requête
├── config.js                   # URL du backend (REACT_APP_API_URL)
├── home/Home.jsx               # Page d'accueil
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
- `npm test` : lance les tests

## Docker

L'image construit l'application puis la sert avec nginx :

```bash
docker build --build-arg REACT_APP_API_URL=http://localhost:5000 -t excel-to-json .
docker run -p 8080:80 excel-to-json   # http://localhost:8080
```

`REACT_APP_API_URL` est intégrée au moment du build : il faut reconstruire l'image pour la changer.
