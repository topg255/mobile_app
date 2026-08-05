# 📘 LEONI Qualité IA — Documentation Complète du Projet

> Application full-stack de gestion de la qualité en temps réel pour les lignes de production LEONI.
> **Backend** : NestJS 11 + TypeORM + PostgreSQL · **Frontend** : React 19 + Vite + TypeScript + Tailwind CSS · **Temps réel** : Socket.IO · **IA** : génération automatisée de rapports quotidiens (PDF + email).

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Architecture technique](#2-architecture-technique)
3. [Rôles et permissions](#3-rôles-et-permissions)
4. [Fonctionnalités par rôle](#4-fonctionnalités-par-rôle)
5. [Fonctionnalités transverses](#5-fonctionnalités-transverses)
6. [Module Rapports IA (détail)](#6-module-rapports-ia-détail)
7. [API Backend — Référence des routes](#7-api-backend--référence-des-routes)
8. [Base de données — Entités](#8-base-de-données--entités)
9. [Installation et démarrage](#9-installation-et-démarrage)
10. [Variables d'environnement](#10-variables-denvironnement)
11. [Docker](#11-docker)
12. [Structure du projet](#12-structure-du-projet)
13. [Fonctionnalités récentes](#13-fonctionnalités-récentes)
14. [Comptes par défaut](#14-comptes-par-défaut)

---

## 1. Présentation générale

**LEONI Qualité IA** est une application web professionnelle (mobile-first) destinée au **suivi qualité des lignes de production**. Les agents qualité enregistrent en temps réel l'état de chaque ligne de contrôle (conforme / à surveiller / critique), le superviseur qualité pilote ses équipes et génère des rapports, et un **rapport IA quotidien** est automatiquement généré à **18h00**, transformé en **PDF professionnel** et **envoyé par email** au superviseur et aux destinataires additionnels qu'il a configurés.

L'application intègre également :
- Un **chat temps réel** de type WhatsApp (isolation par tenant)
- Une **bibliothèque d'images** organisée en dossiers (photos de lignes, preuves qualité)
- Un système de **notifications en temps réel**
- Une **messagerie d'archivage des rapports** (Rapport Libraries)
- Un **tableau de bord Super Admin** complet (utilisateurs, logs, statistiques)
- Une interface **100 % responsive** avec navigation mobile (barre inférieure type Instagram)

---

## 2. Architecture technique

### 2.1 Stack

| Couche | Technologie |
|---|---|
| Backend | NestJS 11 (Node.js ≥ 22), TypeScript |
| ORM | TypeORM (`synchronize: true`) |
| Base de données | PostgreSQL 16 (port 5432) |
| Authentification | JWT (`access-token`) + guards (JwtAuthGuard, RolesGuard) |
| Temps réel | Socket.IO (chat + namespace notifications) |
| Emails | Nodemailer via SMTP Gmail (`GMAIL_USER` / `GMAIL_PASS`) |
| PDF | PDFKit (gabarit professionnel LEONI : KPIs, donut chart, bar chart) |
| Planification | `@nestjs/schedule` — cron quotidien `0 18 * * *` |
| API Docs | Swagger — `http://localhost:3000/api/docs` |
| Frontend | React 19 + Vite 8 + TypeScript + Tailwind CSS 4 |
| UI Icons | lucide-react |
| Exports | XLSX (Excel), jsPDF (PDF côté client) |
| Notification navigateur | react-hot-toast |

### 2.2 Ports & services

| Service | Adresse |
|---|---|
| Backend API | `http://localhost:3000/api` |
| Swagger | `http://localhost:3000/api/docs` |
| Frontend | `http://localhost:5173` |
| PostgreSQL | `localhost:5432` (base `qualite_db`) |
| Fichiers uploadés | `backend/uploads/` (servis statiquement) |

### 2.3 Sécurité

- Mots de passe hachés **bcrypt**
- JWT avec secret (`JWT_SECRET`)
- Garde `JwtAuthGuard` + `RolesGuard` sur toutes les routes
- **Isolation multi-tenant** : un superviseur ne voit que les agents liés via `superviseurId` ; un agent ne voit que son superviseur ; le Super Admin voit tout
- Validation des DTO avec `class-validator`
- Multer : images uniquement (jpg/png/gif/webp, max 5 Mo — 10 Mo pour la bibliothèque)

---

## 3. Rôles et permissions

### 👑 Super Admin (`super_admin`)
| Capacité | Détail |
|---|---|
| Approbation | Approuve / désapprouve les **superviseurs** après inscription |
| Gestion utilisateurs | Liste tous les comptes, supprime les utilisateurs (avec nettoyage en cascade) |
| Statistiques | Total utilisateurs, agents, superviseurs, en attente, approuvés, logs |
| Logs | Historique des connexions / déconnexions (IP, user-agent, horodatage) |
| Chat | Voir **toutes** les conversations |
| Rapports IA | Générer manuellement, consulter tous les rapports, gérer les destinataires (tous superviseurs) |
| Compte seed | `gaith.ghanmi@gmail.com` / `adminUser123*` |

### 🧑‍💼 Superviseur Qualité (`superviseur_qualite`)
| Capacité | Détail |
|---|---|
| Inscription | Auto-inscription → **en attente d'approbation du Super Admin** |
| Code superviseur | Code unique `SUPERV-QLT-XXXXX` communiqué aux agents |
| Agents | Voir uniquement **ses** agents (tenant) ; approuve / rejette chaque nouvel agent |
| Lignes | Voit les lignes de tous ses agents + ses propres lignes |
| Rapports | Rapport périodique (dates), **Rapports IA** (génération, PDF, suppression) |
| Destinataires email | Ajoute / supprime des emails additionnels recevant le rapport IA (envoyé à lui-même + en copie aux emails ajoutés) |
| Bibliothèque | Tous les fichiers + **Dossiers Agents** (uniquement les agents de son tenant) |
| Chat | Messages avec **ses** agents uniquement |
| Dashboard | Vue d'ensemble : KPIs, distribution vert/jaune/rouge, activité, suivi des temps |

### 🧑‍🔧 Agent Qualité (`agent_qualite`)
| Capacité | Détail |
|---|---|
| Inscription | Auto-inscription via **code superviseur** → **auto-approuvé** mais doit être approuvé par son superviseur (`isApprovedBySuperviseur`) |
| Blocage temporaire | Si non approuvé par le superviseur : écran de brouillard plein écran avec nom du superviseur + bouton déconnexion |
| Contrôles | Enregistre les **lignes de contrôle** (nom, heure, note vert/jaune/rouge, délai, responsable, détails, photo) |
| Dates | Crée des dates de contrôle (aujourd'hui ou futur uniquement) |
| Lignes | « Mes lignes » : CRUD sur ses propres lignes |
| Bibliothèque | Upload / gère **ses** images (dossiers, corbeille) |
| Chat | Messages avec **son** superviseur uniquement |
| Barre du haut | `Prénom Nom (Prénom Nom superviseur — Superviseur)` |
| Rapports | Consulte le rapport périodique sur ses lignes (lecture) |

---

## 4. Fonctionnalités par rôle

### 4.1 Authentification (tous)

- **Login** : matricule **ou** email + mot de passe (+ « Se souvenir de moi »)
- **Inscription superviseur** : prénom, nom, matricule, email, mot de passe, photo de profil
- **Inscription agent** : + **code superviseur** (`SUPERV-QLT-XXXXX`)
- **Mot de passe oublié** : email de réinitialisation avec lien à durée limitée (15 min), token haché en base
- **Profil** : photo de profil, modification, code superviseur visible + copie (`copyToClipboard` avec fallback execCommand)
- **Déconnexion** : journalisée (IP + user-agent)

### 4.2 Dashboard Superviseur — onglets

| Onglet | Contenu |
|---|---|
| **Vue d'ensemble** | Bannière de bienvenue, KPIs (lignes du jour, conformes, minutes d'arrêt), distribution vert/jaune/rouge, carte d'activité, panneau de suivi des temps |
| **Dates de contrôle** | Création (date ≥ aujourd'hui), liste, suppression |
| **Lignes** (sous-onglets) | `Mes lignes` / `Lignes agents` (par agent), CRUD complet, photo de ligne, badge note |
| **Historique** | Historique des agents (nombre de lignes, détail) |
| **Mes agents** | Cartes professionnelles (avatar, matricule, stats), approbation / rejet des agents |
| **Rapport** | Rapport périodique par intervalle de dates : KPIs, répartition %, minutes cumulées, tableau détaillé, export **Excel** et **PDF** (jsPDF) |
| **Rapports IA** | Stats (total / envoyés / échoués), génération manuelle, détail (KPIs, résumé, analyse IA, recommandations), téléchargement PDF, suppression, **gestion des destinataires email** |
| **Rapport Libraries** | Archives des rapports : grille de dossiers par référence `REF-LEONI-...`, visualiseur PDF plein écran intégré |
| **Messages** | Chat WhatsApp-style avec ses agents |
| **Images** | Bibliothèque d'images complète |
| **Profil** | Paramètres du compte |

### 4.3 Dashboard Agent — onglets

| Onglet | Contenu |
|---|---|
| **Vue d'ensemble** | KPIs personnels et suivi des temps |
| **Ajouter ligne** | Formulaire rapide de contrôle (note, délai, responsable, photo) |
| **Modifier ligne** | Édition de ses lignes |
| **Mes lignes** | Liste + suppression |
| **Rapport** | Rapport périodique de ses lignes (lecture) |
| **Messages** | Chat avec son superviseur |
| **Images** | Sa bibliothèque d'images |
| **Profil** | Paramètres |

### 4.4 Dashboard Super Admin (`SuperAdminDashboard.tsx`)

| Onglet | Contenu |
|---|---|
| **Vue d'ensemble** | Statistiques globales (utilisateurs, agents, superviseurs, en attente, approuvés, logs) |
| **Utilisateurs** | Tableau complet, filtres, **approuver / désapprouver / supprimer** (superviseurs et agents), profil |
| **Logs** | Historique paginé des connexions (action, IP, user-agent, date) |
| **Rapports** | Accès aux rapports IA de tous les superviseurs + gestion des destinataires |

---

## 5. Fonctionnalités transverses

### 💬 Chat temps réel (WhatsApp-style)
- Socket.IO avec authentification JWT
- **Isolation par tenant** : superviseur ⇄ ses agents ; Super Admin ⇄ tous
- Bulles de message avec queue (tails), fond à motifs de points, thème bleu/blanc
- Recherche de conversations, horodatages, nombres de non-lus
- **Modifier / supprimer** un message (soft delete `isEdited` / `isDeleted`)
- Plein écran mobile avec animation de glissement

### 🔔 Notifications temps réel
- Bell avec dropdown, compteur de non-lus
- Types : message, ligne ajoutée, ligne modifiée, rapport généré
- Namespace Socket.IO `/notifications`

### 🖼️ Bibliothèque d'images (File Manager)
- Vue **grille / liste**, recherche
- **Dossiers** : créer, renommer, supprimer, navigation par clic, drag & drop des images vers un dossier
- Upload multiple (zone glisser-déposer, aperçus, datalist des noms de lignes)
- **Corbeille** : restaurer / suppression définitive
- Sélection multiple → déplacement groupé / suppression groupée
- Modale de détail : métadonnées (fichier, taille, type, dossier), **description modifiable**, changement de dossier, suppression
- **Dossiers Agents** (superviseur) : par agent, **isolé par tenant**
- Responsive : sidebar horizontale, 2 colonnes sur mobile, modales bottom-sheet

### 📊 Rapport périodique (onglet Rapport)
- Intervalle de dates (début / fin)
- KPIs : total lignes, répartition vert/jaune/rouge (+ %), minutes d'arrêt cumulées
- Tableau détaillé (ligne, heure, note, délai, responsable, agent, date)
- Export **Excel** (XLSX) et **PDF** (jsPDF + autoTable)

---

## 6. Module Rapports IA (détail)

### Flux complet
```
Cron quotidien 18h00 (ou bouton "Generer maintenant")
        │
        ▼
Pour chaque superviseur approuvé :
   1. Collecte des KPIs du jour (ai-report.service)
      • Lignes par ControleDate du jour (ou created_at du jour)
      • vert/jaune/rouge + %, minutes d'arrêt, agents actifs,
        top agent, lignes critiques, répartition horaire 06h-22h
   2. Génération du contenu "IA" (règles métier)
      • Résumé + statut global (Excellent / Satisfaisant / Attention / Critique)
      • Analyse IA rédigée en français (distribution, points critiques, pics, top agent)
      • Recommandations [URGENT]/[OK]
   3. Upsert du DailyReport (par superviseur + date)
   4. Génération du PDF professionnel (PDFKit)
      • En-tête dégradé, logos 5S + LEONI (backend/assets)
      • Cartes KPI, donut chart, bar chart horaire, analyse, recommandations
      • Référence : REF-LEONI-{ligne}-{agent}-{numéro}
   5. Envoi email (HTML + PDF joint) via Gmail SMTP
      • To : superviseur (email principal)
      • CC : tous les destinataires additionnels configurés
      • 3 tentatives avec backoff (5s × tentative)
   6. Statut : SENT (email_sent_at) ou GENERATED (errorMessage)
   7. Notification temps réel au superviseur
```

### Destinataires additionnels (feature récente)
- Le superviseur ajoute des emails depuis l'onglet **Rapports IA** → carte **« Destinataires du rapport IA »**
- Validation : format email, pas de doublon (unique superviseur+email, insensible à la casse), impossible d'ajouter son propre email
- Le rapport est envoyé **au superviseur + en CC à tous les emails ajoutés**
- Table `report_recipients` ; le champ `email_recipient` du rapport stocke la liste complète
- Super Admin : voit tous les destinataires, peut en ajouter pour n'importe quel superviseur (`?superviseurId=`)

---

## 7. API Backend — Référence des routes

> Préfixe global : `/api` · Toutes les routes sauf auth requièrent `Authorization: Bearer <token>`

### 🔐 Auth (`/auth`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login matricule ou email |
| POST | `/auth/signup/superviseur-qualite` | Public | Inscription superviseur (approbation requise) |
| POST | `/auth/signup/agent-qualite` | Public | Inscription agent avec code superviseur |
| GET | `/auth/profile` | Auth | Profil de l'utilisateur connecté |
| POST | `/auth/logout` | Auth | Déconnexion (journalisée) |
| POST | `/auth/forgot-password` | Public | Envoie l'email de réinitialisation |
| POST | `/auth/reset-password` | Public | Réinitialise le mot de passe (token 15 min) |

### 🏭 Qualité (`/quality`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/quality/controle-dates` | Agent, Superviseur | Dates de contrôle (agents : les leurs) |
| POST | `/quality/controle-dates` | Agent | Créer une date (aujourd'hui ou futur) |
| DELETE | `/quality/controle-dates/:id` | Agent | Supprimer une date |
| GET | `/quality/lignes` | Superviseur | Toutes les lignes de ses agents |
| GET | `/quality/lignes/mes-lignes` | Agent | Ses lignes |
| POST | `/quality/lignes` | Agent | Créer une ligne de contrôle |
| POST | `/quality/lignes/:id/image` | Agent | Upload photo de ligne |
| PATCH | `/quality/lignes/:id` | Agent | Modifier une ligne |
| DELETE | `/quality/lignes/:id` | Agent | Supprimer une ligne |
| GET | `/quality/historique-agents` | Superviseur | Historique de ses agents (tenant) |
| POST | `/quality/rapport` | Agent, Superviseur | Rapport périodique (début/fin, agentId optionnel) |

### 👑 Super Admin (`/super-admin`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/super-admin/stats` | Super Admin | Statistiques globales |
| GET | `/super-admin/users` | Super Admin | Liste des utilisateurs |
| GET | `/super-admin/users/pending` | Super Admin | Utilisateurs en attente |
| PATCH | `/super-admin/users/:id/approve` | Super Admin | Approuver / désapprouver |
| DELETE | `/super-admin/users/:id` | Super Admin | Supprimer (cascade) |
| GET | `/super-admin/logs` | Super Admin | Logs de connexion paginés |

### 💬 Chat (`/chat`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/chat/conversations` | Tous | Conversations (isolées par tenant) |
| GET | `/chat/:userId` | Tous | Historique avec un utilisateur |
| POST | `/chat/send` | Tous | Envoyer un message |
| PATCH | `/chat/:id` | Tous | Modifier un message |
| DELETE | `/chat/:id` | Tous | Supprimer (soft) un message |
| GET | `/chat/unread` | Tous | Nombre de messages non lus |

### 🔔 Notifications (`/notifications`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/notifications` | Tous | Liste des notifications |
| PATCH | `/notifications/:id/read` | Tous | Marquer comme lue |
| PATCH | `/notifications/read-all` | Tous | Tout marquer comme lu |
| GET | `/notifications/unread-count` | Tous | Compteur non lus |

### 🖼️ Bibliothèque (`/library`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/library/upload` | Tous | Upload image (max 10 Mo) |
| GET | `/library/images` | Tous | Images (`folderId`, `agentId` — **tenant vérifié**) |
| PATCH | `/library/images/:id` | Tous | Description / dossier |
| DELETE | `/library/images/:id` | Tous | Corbeille (soft delete) |
| POST | `/library/images/:id/restore` | Tous | Restaurer |
| DELETE | `/library/images/:id/permanent` | Tous | Suppression définitive |
| POST | `/library/move` | Tous | Déplacer plusieurs images |
| GET | `/library/folders` | Tous | Dossiers (`agentId` — **tenant vérifié**) |
| POST | `/library/folders` | Tous | Créer un dossier |
| PATCH | `/library/folders/:id` | Tous | Renommer |
| DELETE | `/library/folders/:id` | Tous | Supprimer un dossier |
| GET | `/library/stats` | Tous | Statistiques (`agentId` — **tenant vérifié**) |

### 🤖 Rapports IA (`/reports`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/reports/generate` | Super Admin, Superviseur | Génération manuelle (`?date=YYYY-MM-DD`) |
| GET | `/reports` | Super Admin, Superviseur | Historique paginé (`page`, `limit`, `superviseurId`) |
| GET | `/reports/stats` | Super Admin, Superviseur | Total / envoyés / échoués |
| GET | `/reports/recipients` | Super Admin, Superviseur | Destinataires additionnels |
| POST | `/reports/recipients` | Super Admin, Superviseur | Ajouter (`{email}`) — Super Admin : `?superviseurId=` |
| DELETE | `/reports/recipients/:id` | Super Admin, Superviseur | Supprimer un destinataire |
| GET | `/reports/:id` | Super Admin, Superviseur | Détail d'un rapport |
| GET | `/reports/:id/pdf` | Super Admin, Superviseur | Télécharger le PDF |
| DELETE | `/reports/:id` | Super Admin, Superviseur | Supprimer un rapport |

---

## 8. Base de données — Entités

| Table | Entité | Rôles / clés notables |
|---|---|---|
| `users` | User | `role` (enum), `isApproved`, `isApprovedBySuperviseur`, `superviseurCode`, `superviseurId` (FK tenant), `profileImage`, `resetToken` + expiration |
| `login_logs` | LoginLog | `user` (FK), `action` (login/logout), `ipAddress`, `userAgent`, `loggedAt` |
| `controle_dates` | ControleDate | `dateControle`, `isActive`, `createdBy` |
| `lignes_controle` | LigneControle | `nomLigne`, `heure`, `note` (vert/jaune/rouge), `delais`, `responsable`, `details`, `image`, `controleDate` (FK), `agent` (FK) |
| `daily_reports` | DailyReport | `superviseur` (FK), `reportDate`, `summary`, `kpis` (jsonb), `aiAnalysis`, `recommendations`, `status`, `emailSentAt`, `emailRecipient` (liste), `errorMessage` |
| `report_recipients` | ReportRecipient | `superviseurId` (FK) + `email`, **unique (superviseurId, email)** |
| `messages` | Message | `sender`, `receiver`, `content`, `isRead`, `isEdited`, `isDeleted`, timestamps |
| `notifications` | Notification | `user` (FK), `type` (enum), `message`, `isRead`, `relatedId` |
| `library_images` | LibraryImage | `url`, `filename`, `originalName`, `mimeType`, `fileSize`, `description`, `uploadedBy` (FK), `folder` (FK), `isDeleted`, `deletedAt` |
| `image_folders` | ImageFolder | `name`, `createdBy` (FK) |

> `synchronize: true` : les tables sont créées/mises à jour automatiquement au démarrage du backend.

---

## 9. Installation et démarrage

### Prérequis
- Node.js **≥ 22** (requis par Vite 8)
- PostgreSQL 16 (ou Docker)
- npm ≥ 10

### Sans Docker (développement)
```bash
# 1. Backend
cd backend
npm install
# configurer backend/.env (voir section 10)
npm run start:dev        # API sur :3000

# 2. Frontend (autre terminal)
cd front
npm install
npm run dev              # UI sur :5173
```

### Avec Docker (recommandé)
```bash
cd backend
docker-compose up --build
# seed automatique du Super Admin au premier démarrage
```

### Scripts utiles
| Commande | Action |
|---|---|
| `backend: npm run start:dev` | Backend en mode dev |
| `backend: npm run build` | Compilation TypeScript |
| `backend: npm run seed` | Seed Super Admin (TypeORM) |
| `backend: node scripts/seed.js` | Seed Super Admin (pg natif) |
| `front: npm run dev` | Frontend dev |
| `front: npm run build` | Build de production |

---

## 10. Variables d'environnement

### `backend/.env`
| Variable | Exemple | Description |
|---|---|---|
| `DB_HOST` | `db` (Docker) / `localhost` | Hôte PostgreSQL |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `DB_USERNAME` | `postgres` | Utilisateur BD |
| `DB_PASSWORD` | `postgres` | Mot de passe BD |
| `DB_NAME` | `qualite_db` | Nom de la base |
| `JWT_SECRET` | (secret) | Signature des tokens JWT |
| `GMAIL_USER` | `xxx@gmail.com` | Expéditeur des rapports IA (SMTP Gmail) |
| `GMAIL_PASS` | (mot de passe applicatif) | App password Gmail |
| `SMTP_HOST/PORT/USER/PASS` | — | SMTP générique (emails de réinitialisation) |
| `FRONTEND_URL` | `http://localhost:5173` | Lien de réinitialisation dans l'email |

---

## 11. Docker

### `backend/docker-compose.yml`
- **db** : `postgres:16-alpine`, base `qualite_db`, exposé sur `127.0.0.1:5432`
- **backend** : build via Dockerfile, port `3000:3000`

### `backend/Dockerfile`
- Build en 2 étapes (node:20-alpine) → utilisateur non-root `appuser`
- Au démarrage : exécute le seed du Super Admin puis lance l'application

---

## 12. Structure du projet

```
mobile_app/
├── backend/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── .env
│   ├── assets/                  # logos 5S + LEONI (PDF)
│   ├── scripts/seed.js          # seed Super Admin (pg)
│   ├── src/
│   │   ├── main.ts              # bootstrap, CORS, Swagger, static uploads
│   │   ├── app.module.ts
│   │   ├── auth/                # login, signup, JWT, guards, User entity
│   │   ├── quality/             # contrôle qualité, rapport périodique
│   │   ├── super-admin/         # approbations, stats, logs
│   │   ├── chat/                # REST + gateway Socket.IO
│   │   ├── notification/        # REST + gateway notifications
│   │   ├── library/             # bibliothèque d'images (upload, dossiers, corbeille)
│   │   ├── report/              # rapports IA : cron, IA, PDF, email, destinataires
│   │   │   ├── dto/
│   │   │   ├── entities/        # daily-report, report-recipient
│   │   │   ├── templates/       # gabarit HTML des emails
│   │   └── mail/                # SMTP générique (reset password)
│   └── uploads/                 # fichiers uploadés (servis statiquement)
├── front/
│   ├── index.html
│   └── src/
│       ├── api/index.ts         # client axios (authAPI, qualityAPI, ...)
│       ├── types/index.ts       # types TypeScript
│       ├── contexts/AuthContext.tsx
│       ├── utils/clipboard.ts   # copie avec fallback mobile
│       ├── components/          # Chat, ImageLibrary, RapportLibraries,
│       │                        # NotificationBell, UserProfileDrawer
│       ├── pages/
│       │   ├── Auth/            # Login, Signup, ForgotPassword, ResetPassword
│       │   ├── Dashboard/       # Dashboard (superviseur+agent), SuperAdminDashboard
│       │   └── Profile/ProfilePage.tsx
│       └── App.css              # design system complet (responsive)
└── .historique/                 # documentation du projet
```

---

## 13. Fonctionnalités récentes

| Date | Fonctionnalité |
|---|---|
| 2026-08 | **Destinataires additionnels des rapports IA** : le superviseur ajoute des emails dans « Rapports IA » ; le rapport quotidien (18h00) est envoyé à son email **+ en CC** à tous les destinataires ; table `report_recipients`, validation anti-doublon et anti-auto-email |
| 2026-08 | **Isolation tenant bibliothèque** : `getImages` / `getFolders` / `getStats` vérifient que l'agent demandé appartient bien au superviseur (`superviseurId`) |
| 2026-08 | **Refonte responsive de la bibliothèque d'images** : sidebar horizontale, grille 2 colonnes, modales bottom-sheet, keyframes corrigés |
| — | Chat WhatsApp-style, rapports IA complets (cron, PDF, email), navigation mobile, etc. |

---

## 14. Comptes par défaut

| Rôle | Email | Mot de passe | Matricule |
|---|---|---|---|
| Super Admin | `gaith.ghanmi@gmail.com` | `adminUser123*` | `SUPER-ADMIN-001` |

> Les superviseurs et agents s'inscrivent via l'écran d'inscription. Le Super Admin approuve les superviseurs ; chaque superviseur approuve ses agents.
