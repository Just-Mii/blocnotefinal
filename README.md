# Bloc-Notes / Calendrier / Journal de Bord

> Espace de travail personnel hébergé sur Vercel — Notes, Calendrier horaire, Journal quotidien, Timer précis et Widgets personnalisables.

---

## 1. Présentation

Bloc-Notes Personnel est un espace de travail hébergé sur Vercel et protégé par mot de passe, conçu pour un usage strictement personnel. Il combine un bloc-notes avancé avec éditeur Markdown, un calendrier horaire (24 créneaux par jour), un journal de bord quotidien, un timer précis au millième de seconde et un système de widgets dynamiques que vous pouvez programmer vous-même en JSX. Toutes les données sont stockées dans Supabase (cloud PostgreSQL), ce qui les rend accessibles depuis n'importe quel appareil, à n'importe quel moment.

---

## 2. Fonctionnalités complètes

### Authentification
L'accès à l'application est protégé par un mot de passe unique stocké sous forme de hash bcrypt dans une variable d'environnement Vercel. Aucun compte utilisateur n'est nécessaire : une seule session est active à la fois, sécurisée par un cookie chiffré (iron-session). Le délai d'expiration de session est configurable (15 min, 30 min, 1 heure ou jamais).

### Calendrier horaire
Le calendrier affiche 24 créneaux horaires (00h – 23h) pour chaque jour de l'année. Chaque créneau peut recevoir une note Markdown indépendante, idéale pour planifier ses journées heure par heure. La navigation entre les jours est fluide et la date du jour est mise en évidence automatiquement.

### Journal de bord quotidien
Une entrée de journal est générée pour chaque jour, avec une zone d'écriture Markdown libre et un champ d'humeur optionnel. Les entrées sont indexées par date et consultables via la recherche globale. L'historique complet est exportable en JSON depuis les paramètres.

### Bloc-notes
Les notes standalone sont organisables en projets et taggables avec des étiquettes colorées. Chaque note supporte le Markdown complet avec mise en forme, listes, code et tableaux. Les notes supprimées passent dans une corbeille et sont purgées automatiquement après 30 jours.

### Projets
Les notes peuvent être regroupées dans des projets personnalisés avec couleur et icône. La liste des projets apparaît dans la barre latérale pour un accès rapide. Les projets peuvent être créés, renommés et supprimés à tout moment.

### Éditeur de texte
L'éditeur est basé sur CodeMirror 6 et supporte le Markdown avec coloration syntaxique en temps réel. Le mode prévisualisation permet d'afficher le rendu HTML du Markdown à côté du code source. La police (monospace ou sans-serif), la taille et la largeur de colonne sont personnalisables dans les paramètres.

### Historique des versions
Chaque modification importante d'une note déclenche automatiquement la création d'une version. Les 10 dernières versions sont conservées par note ; les versions de plus de 90 jours sont purgées automatiquement. Il est possible de restaurer n'importe quelle version en un clic depuis le panneau d'historique.

### Recherche globale
La recherche globale interroge simultanément les notes, le calendrier et le journal de bord en plein texte (index GIN PostgreSQL). Les résultats affichent le titre, un extrait contextuel et les tags associés. La recherche est accessible depuis la barre latérale ou le raccourci clavier.

### Tags
Les tags sont des étiquettes colorées que l'on peut attacher à n'importe quelle note ou entrée de journal. Un même tag peut regrouper des notes de types différents (standalone, calendrier). La liste des tags avec leur nombre d'utilisations est visible dans la barre latérale.

### Timer avec millisecondes
Le timer supporte deux modes : chronomètre (stopwatch) et compte à rebours. En mode chronomètre, les temps intermédiaires (laps) sont enregistrables avec affichage du delta. La précision d'affichage descend jusqu'au millième de seconde et peut être désactivée dans les paramètres pour un affichage plus sobre.

### Système de widgets dynamiques
Les widgets sont de petits composants React écrits en JSX directement dans l'application. Chaque widget peut être positionné dans la sidebar, en mode flottant ou en pleine page. Le moteur d'exécution isole le code du widget dans un contexte sécurisé avec accès à une API réseau contrôlée.

### Templates de widgets
Des templates prêts à l'emploi sont disponibles (météo, citations, horloge, RSS…) pour démarrer rapidement. Les widgets peuvent être exportés au format `.widget.js` et partagés ou importés sur une autre instance. Les secrets (clés API) sont stockés chiffrés en base et ne transitent jamais en clair côté client.

### Mode focus
Le mode focus masque la barre latérale et tous les éléments d'interface pour ne laisser que l'éditeur visible. Il est activable depuis la barre d'outils de l'éditeur ou via un raccourci clavier. Ce mode est idéal pour les sessions d'écriture longues ou la concentration profonde.

### Table des matières
La table des matières est générée automatiquement à partir des titres Markdown (H1, H2, H3) de la note active. Elle s'affiche dans un panneau latéral et permet de naviguer dans les sections d'un long document. La table se met à jour en temps réel à mesure que l'on écrit.

### Templates de notes
Des modèles de notes peuvent être définis pour accélérer la création de contenu récurrent (compte-rendu, plan de projet, rétrospective…). Un template s'applique en un clic lors de la création d'une nouvelle note. Les templates sont stockés en base et accessibles depuis le menu de création de note.

### PWA (Progressive Web App)
L'application est installable sur mobile et bureau grâce au fichier `manifest.json`. Elle s'affiche en mode standalone (sans barre de navigation du navigateur) une fois installée. Les métadonnées PWA incluent couleurs de thème, icônes et description pour une intégration soignée sur l'écran d'accueil.

### Responsive
L'interface s'adapte aux écrans de toutes tailles, du smartphone au grand moniteur. Sur mobile, la barre latérale se replie en un menu accessible par glissement ou bouton. Les zones de texte et les contrôles sont suffisamment espacés pour une utilisation tactile confortable.

### Paramètres
La page Paramètres regroupe toutes les options de personnalisation en cinq onglets : Apparence (thème, police, taille), Widgets (liste, import/export), Timer (millisecondes, son), Sécurité (mot de passe, session) et Données (export JSON/ZIP, import, statistiques de stockage, purge des versions). Les modifications sont sauvegardées en base de données et synchronisées sur tous les appareils.

---

## 3. Prérequis

- Compte GitHub (gratuit) — pour héberger le code
- Compte Vercel (gratuit) — vercel.com — pour le déploiement
- Compte Supabase (gratuit) — supabase.com — pour la base de données
- Node.js 18 ou supérieur (pour tester en local)
- npm ou yarn

---

## 4. Mise en place de Supabase

1. Créer un compte sur [supabase.com](https://supabase.com)
2. Cliquer "New project", choisir un nom et sélectionner la région **Europe West**
3. Attendre la création du projet (environ 1 minute)
4. Aller dans **Settings > API**, copier :
   - `Project URL` → ce sera `SUPABASE_URL`
   - `anon public` key → ce sera `SUPABASE_ANON_KEY`
5. Aller dans **SQL Editor**, coller le contenu du fichier `schema.sql`, puis cliquer **Run**
6. Vérifier dans **Table Editor** que ces tables existent :
   `notes`, `daily_journal`, `note_versions`, `projects`, `tags`, `notes_tags`, `widgets`, `app_settings`

---

## 5. Générer le mot de passe hashé

Le mot de passe ne doit **jamais** être stocké en clair. Utilisez bcrypt pour générer un hash :

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('MON_MOT_DE_PASSE', 10).then(h => console.log(h))"
```

La valeur affichée (qui commence par `$2b$10$...`) est à coller dans la variable `APP_PASSWORD` sur Vercel.

---

## 6. Déploiement sur Vercel

1. Pousser le code sur un dépôt GitHub (public ou privé)
2. Aller sur [vercel.com](https://vercel.com), cliquer **"Add New Project"**
3. Importer votre dépôt GitHub
4. Dans **"Environment Variables"**, ajouter ces 4 variables :

   | Variable | Valeur |
   |----------|--------|
   | `SUPABASE_URL` | URL de votre projet Supabase |
   | `SUPABASE_ANON_KEY` | Clé anon Supabase |
   | `NEXT_PUBLIC_SUPABASE_URL` | Même URL Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Même clé anon |
   | `APP_PASSWORD` | Hash bcrypt généré à l'étape précédente |
   | `SESSION_SECRET` | Chaîne aléatoire 32+ caractères (générer : `openssl rand -base64 32`) |
   | `WIDGET_ENCRYPTION_KEY` | Clé hex 32 chars (générer : `openssl rand -hex 16`) |

5. Cliquer **"Deploy"**, attendre 1 à 2 minutes
6. Vercel fournit une URL type `mon-app.vercel.app` — c'est votre application !

---

## 7. Tester en local

```bash
git clone https://github.com/TON_USER/TON_REPO.git
cd TON_REPO
npm install
cp .env.example .env.local
# Remplir .env.local avec vos vraies valeurs
npm run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

---

## 8. Ajouter un widget personnalisé

1. Dans la **sidebar**, cliquer sur **Widgets**
2. Cliquer **"Nouveau widget"**
3. Donner un nom au widget
4. Écrire le code JSX dans l'éditeur (composant React avec `export default function Widget()`)
5. La prévisualisation se met à jour en temps réel (debounce 800ms)
6. Si votre widget appelle une API : onglet **"Secrets"** → ajouter votre clé sous la forme `NOM_CLE = valeur`
7. Dans le code, utiliser `WidgetAPI.fetch(url)` pour les appels HTTP et référencer un secret avec `SECRET:NOM_CLE` dans l'URL
8. Cliquer **"Sauvegarder"** : le widget est stocké dans Supabase et rechargé automatiquement à chaque session

---

## 9. Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `SUPABASE_URL` | URL du projet Supabase | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Clé publique Supabase | `eyJhbGci...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Même URL (côté client) | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Même clé (côté client) | `eyJhbGci...` |
| `APP_PASSWORD` | Hash bcrypt du mot de passe | `$2b$10$...` |
| `SESSION_SECRET` | Clé secrète pour les cookies | `une-longue-chaine-aleatoire` |
| `WIDGET_ENCRYPTION_KEY` | Clé chiffrement secrets widgets | `0123456789abcdef...` |

---

## 10. Dépannage fréquent

**"Invalid password" au login**
`APP_PASSWORD` doit contenir le hash bcrypt (commence par `$2b$10$`), pas le mot de passe en clair.

**Erreur de connexion Supabase**
Vérifier que `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont copiées sans espace avant/après.

**Les tables n'existent pas**
Relancer le fichier `schema.sql` depuis SQL Editor dans le tableau de bord Supabase.

**Widget qui ne charge pas**
Vérifier la syntaxe JSX dans l'éditeur. Les erreurs sont affichées sous l'éditeur en rouge.

**Déploiement Vercel échoue**
Vérifier que toutes les variables d'environnement sont correctement renseignées dans les paramètres du projet Vercel.

**Journal d'un jour introuvable**
La date est stockée en UTC dans Supabase. Vérifier que le frontend envoie bien la date locale (format `YYYY-MM-DD`) et non une date UTC décalée.

**L'app approche de la limite de stockage Supabase (500 MB)**
Le plan gratuit est limité à 500 MB. Pour du texte pur c'est très large (~250 millions de mots). Si vous approchez de la limite : aller dans **Paramètres > Données** et cliquer "Purger les anciennes versions". Si nécessaire, exporter toutes les notes en ZIP et supprimer les anciennes de la corbeille. Le plan Pro Supabase offre 8 GB pour 25€/mois.

---

*Généré avec ❤️ — Next.js 14 + Supabase + Vercel*
