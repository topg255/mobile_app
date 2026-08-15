# 📘 LEONI Qualité IA — Documentation Complète du Projet

> Application full-stack de gestion de la qualité en temps réel pour les lignes de production LEONI.
> **Backend** : NestJS 11 + TypeORM + PostgreSQL · **Frontend** : React 19 + Vite + TypeScript + Tailwind CSS · **Temps réel** : Socket.IO · **IA** : Mistral AI (copilot, CAPA, signatures).

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Architecture technique](#2-architecture-technique)
3. [Rôles et permissions](#3-rôles-et-permissions)
4. [Fonctionnalités par rôle](#4-fonctionnalités-par-rôle)
5. [Fonctionnalités transverses](#5-fonctionnalités-transverses)
6. [Module Rapports IA (détail)](#6-module-rapports-ia-détail)
7. [Module CAPA (détail)](#7-module-capa-détail)
8. [Module Objectifs Qualité (détail)](#8-module-objectifs-qualité-détail)
9. [Module Copilote IA (détail)](#9-module-copilote-ia-détail)
10. [Module Push Notifications (détail)](#10-module-push-notifications-détail)
11. [Module Signature Numérique (détail)](#11-module-signature-numérique-détail)
12. [Module Calendrier (détail)](#12-module-calendrier-détail)
13. [API Backend — Référence des routes](#13-api-backend--référence-des-routes)
14. [Base de données — Entités](#14-base-de-données--entités)
15. [Installation et démarrage](#15-installation-et-démarrage)
16. [Variables d'environnement](#16-variables-denvironnement)
17. [Docker](#17-docker)
18. [Structure du projet](#18-structure-du-projet)
19. [Fonctionnalités récentes](#19-fonctionnalités-récentes)
20. [Comptes par défaut](#20-comptes-par-défaut)

---

## 1. Présentation générale

**LEONI Qualité IA** est une application web professionnelle (mobile-first) destinée au **suivi qualité des lignes de production**. Les agents qualité enregistrent en temps réel l'état de chaque ligne de contrôle (conforme / à surveiller / critique), le superviseur qualité pilote ses équipes et génère des rapports, et un **rapport IA quotidien** est automatiquement généré à **18h00**, transformé en **PDF professionnel** et **envoyé par email** au superviseur et aux destinataires additionnels qu'il a configurés.

L'application intègre également :
- Un **chat temps réel** de type WhatsApp (isolation par tenant)
- Une **bibliothèque d'images** organisée en dossiers (photos de lignes, preuves qualité)
- Un système de **notifications temps réel** (in-app + Web Push VAPID)
- Une **messagerie d'archivage des rapports** (Rapport Libraries)
- Un **tableau de bord Super Admin** complet (utilisateurs, logs, statistiques)
- Un **copilote IA** (Mistral) pour analyser les données qualité en conversation
- Un module **CAPA** (Corrective And Preventive Action) avec analyse IA des causes racines
- Un module **Objectifs Qualité** (OKR) avec moteur de prédiction et badges
- Un module **Signature Numérique** (PDF signing + audit trail)
- Un module **Calendrier** avec tâches assignées et récurrence
- Des **Push Notifications** Web Push avec escalade et analytics
- Une interface **100 % responsive** avec navigation mobile (barre inférieure type Instagram)

---

## 2. Architecture technique

### 2.1 Stack

| Couche | Technologie |
|---|---|
| Backend | NestJS 11 (Node.js ≥ 22), TypeScript |
| ORM | TypeORM (`synchronize: true`) |
| Base de données | PostgreSQL 16 (port 5432) |
| Authentification | JWT (`access-token`) + guards (JwtAuthGuard, RolesGuard, RateLimitGuard) |
| Temps réel | Socket.IO (chat + namespace notifications) |
| Emails | Nodemailer via SMTP Gmail (`GMAIL_USER` / `GMAIL_PASS`) |
| PDF | PDFKit (rapports IA) + pdf-lib (CAPA, signatures) |
| Planification | `@nestjs/schedule` — cron quotidien `0 18 * * *` + escalade push (30s) + cleanup (03:00) |
| IA | Mistral AI — `mistral-large-latest` (copilot, CAPA), `pixtral-large-latest` (signatures) |
| Push | Web Push VAPID (service worker + navigateur) |
| API Docs | Swagger — `http://localhost:3000/api/docs` |
| Frontend | React 19 + Vite 8 + TypeScript + Tailwind CSS 4 |
| Calendrier | FullCalendar (4 vues : mois/semaine/jour/liste) |
| UI Icons | lucide-react |
| Exports | XLSX (Excel), jsPDF (PDF côté client), PDFKit (PDF côté serveur) |
| Notification navigateur | react-hot-toast + Web Push |

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
- **RateLimitGuard** : limitation de débit en mémoire (30 req/min) sur routes push
- **Isolation multi-tenant** : un superviseur ne voit que les agents liés via `superviseurId` ; un agent ne voit que son superviseur ; le Super Admin voit tout
- Validation des DTO avec `class-validator`
- Multer : images uniquement (jpg/png/gif/webp, max 5 Mo — 10 Mo pour la bibliothèque)
- **Web Push VAPID** : clés VAPID pour notifications navigateur sécurisées

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
| Rapports IA | Générer manuellement, consulter tous les rapports, gérer les destinataires |
| CAPA | Voir et gérer toutes les CAPAs |
| Objectifs | Voir et gérer tous les objectifs qualité |
| Copilote | Accès au copilote IA |
| Push | Configurer l'escalade, envoyer des notifications ciblées |
| Calendrier | Créer des événements pour tous les superviseurs |
| Signature | Signer et vérifier les rapports PDF |
| Compte seed | `gaith.ghanmi@gmail.com` / `adminUser123*` |

### 🧑‍💼 Superviseur Qualité (`superviseur_qualite`)
| Capacité | Détail |
|---|---|
| Inscription | Auto-inscription → **en attente d'approbation du Super Admin** |
| Code superviseur | Code unique `SUPERV-QLT-XXXXX` communiqué aux agents |
| Agents | Voir uniquement **ses** agents (tenant) ; approuve / rejette chaque nouvel agent |
| Lignes | Voit les lignes de tous ses agents + ses propres lignes |
| Rapports | Rapport périodique (dates), **Rapports IA** (génération, PDF, suppression) |
| Destinataires email | Ajoute / supprime des emails additionnels recevant le rapport IA |
| CAPA | **Créer, gérer, clôturer** des CAPAs avec analyse IA des causes racines |
| Objectifs | **Créer et suivre** des objectifs qualité (OKR) |
| Copilote | **Assistant IA** conversationnel pour analyser les données qualité |
| Calendrier | **Planifier** des inspections, réunions, audits, formations |
| Signature | **Signer numériquement** les rapports PDF |
| Bibliothèque | Tous les fichiers + **Dossiers Agents** (uniquement les agents de son tenant) |
| Chat | Messages avec **ses** agents uniquement |
| Dashboard | Vue d'ensemble : KPIs, distribution vert/jaune/rouge, activité, suivi des temps |
| Push | Gérer ses préférences de notification push |

### 🧑‍🔧 Agent Qualité (`agent_qualite`)
| Capacité | Détail |
|---|---|
| Inscription | Auto-inscription via **code superviseur** → **auto-approuvé** mais doit être approuvé par son superviseur (`isApprovedBySuperviseur`) |
| Blocage temporaire | Si non approuvé par le superviseur : écran de brouillard plein écran avec nom du superviseur + bouton déconnexion |
| Contrôles | Enregistre les **lignes de contrôle** (nom, heure, note vert/jaune/rouge, délai, responsable, détails, photo) |
| Dates | Crée des dates de contrôle (aujourd'hui ou futur uniquement) |
| Lignes | « Mes lignes » : CRUD sur ses propres lignes |
| Tâches | Voit les **tâches assignées** par le superviseur (calendrier) et peut les marquer terminées |
| CAPA | **Compléter les actions** CAPA assignées (avec preuve) |
| Bibliothèque | Upload / gère **ses** images (dossiers, corbeille) |
| Chat | Messages avec **son** superviseur uniquement |
| Barre du haut | `Prénom Nom (Prénom Nom superviseur — Superviseur)` |
| Rapports | Consulte le rapport périodique sur ses lignes (lecture) |
| Push | Gère ses préférences de notification push |

---

## 4. Fonctionnalités par rôle

### 4.1 Authentification (tous)

- **Login** : matricule **ou** email + mot de passe (+ « Se souvenir de moi »)
- **Inscription superviseur** : prénom, nom, matricule, email, mot de passe, photo de profil
- **Inscription agent** : + **code superviseur** (`SUPERV-QLT-XXXXX`)
- **Mot de passe oublié** : email de réinitialisation avec lien à durée limitée (15 min), token haché en base
- **Profil** : photo de profil, modification, code superviseur visible + copie (`copyToClipboard` avec fallback execCommand), carte signature
- **Déconnexion** : journalisée (IP + user-agent)

### 4.2 Dashboard Superviseur — onglets

| Onglet | Contenu |
|---|---|
| **Vue d'ensemble** | Bannière de bienvenue, KPIs (lignes du jour, conformes, minutes d'arrêt), distribution vert/jaune/rouge, carte d'activité, panneau de suivi des temps |
| **Dates de contrôle** | Création (date ≥ aujourd'hui), liste, suppression |
| **Lignes** (sous-onglets) | `Mes lignes` / `Lignes agents` (par agent), CRUD complet, photo de ligne, badge note, bouton **CAPA** sur lignes rouges |
| **Historique** | Historique des agents (nombre de lignes, détail) |
| **Mes agents** | Cartes professionnelles (avatar, matricule, stats), approbation / rejet des agents |
| **Rapport** | Rapport périodique par intervalle de dates : KPIs, répartition %, minutes cumulées, tableau détaillé, export **Excel** et **PDF** (jsPDF) |
| **Rapports IA** | Stats (total / envoyés / échoués), génération manuelle, détail (KPIs, résumé, analyse IA, recommandations), téléchargement PDF, suppression, **gestion des destinataires email**, **signature numérique** |
| **Rapport Libraries** | Archives des rapports : grille de dossiers par référence `REF-LEONI-...`, visualiseur PDF plein écran intégré, **vérification de signature** |
| **Objectifs Qualité** | Dashboard OKR : objectifs avec prédiction, badges, graphiques (évolution, comparaison, risques) |
| **Calendrier** | FullCalendar 4 vues (mois/semaine/jour/liste), création d'événements, assignation de tâches, filtres |
| **Signature** | Créer/ remplacer/ supprimer sa signature numérique, score qualité IA, vectorisation SVG |
| **CAPAs** | Gestion complète des CAPAs : stats, filtres, alertes retard, stepper 5 étapes, analyse IA causes racines, actions, commentaires, PDF |
| **Push** | Paramètres notifications push navigateur, historique, analytics |
| **Messages** | Chat WhatsApp-style avec ses agents |
| **Images** | Bibliothèque d'images complète |
| **Profil** | Paramètres du compte + carte signature |

### 4.3 Dashboard Agent — onglets

| Onglet | Contenu |
|---|---|
| **Vue d'ensemble** | KPIs personnels et suivi des temps |
| **Ajouter ligne** | Formulaire rapide de contrôle (note, délai, responsable, photo) |
| **Modifier ligne** | Édition de ses lignes |
| **Mes lignes** | Liste + suppression |
| **Mes Tâches** | Tâches assignées par le superviseur (calendrier), groupées par semaine, marquer terminées |
| **Rapport** | Rapport périodique de ses lignes (lecture) |
| **Messages** | Chat avec son superviseur |
| **Images** | Sa bibliothèque d'images |
| **Push** | Paramètres notifications push |
| **Profil** | Paramètres |

### 4.4 Dashboard Super Admin (`SuperAdminDashboard.tsx`)

| Onglet | Contenu |
|---|---|
| **Vue d'ensemble** | Statistiques globales (utilisateurs, agents, superviseurs, en attente, approuvés, logs) |
| **Utilisateurs** | Tableau complet, filtres, **approuver / désapprouver / supprimer** (superviseurs et agents), profil |
| **Logs** | Historique paginé des connexions (action, IP, user-agent, date) |
| **Rapports** | Accès aux rapports IA de tous les superviseurs + gestion des destinataires |
| **Objectifs** | Vue tous les objectifs qualité de la plateforme |
| **Calendrier** | Calendrier global avec tous les événements |
| **Push** | Configuration de l'escalade push, envoi ciblé, analytics globaux |
| **Signature** | Vérification et audit des signatures |

---

## 5. Fonctionnalités transverses

### 💬 Chat temps réel (WhatsApp-style)
- Socket.IO avec authentification JWT
- **Isolation par tenant** : superviseur ⇄ ses agents ; Super Admin ⇄ tous
- Bulles de message avec queue (tails), fond à motifs de points, thème bleu/blanc
- Recherche de conversations, horodatages, nombres de non-lus
- **Modifier / supprimer** un message (soft delete `isEdited` / `isDeleted`)
- Plein écran mobile avec animation de glissement
- **Push notification** sur nouveau message chat

### 🔔 Notifications temps réel
- Bell avec dropdown, compteur de non-lus
- Types : message, ligne ajoutée, ligne modifiée, rapport généré, objectif à risque, objectif terminé, objectif échoué, système
- Namespace Socket.IO `/notifications`
- **Notifications calendrier** : assignation, rappel, mise à jour, annulation, complétion

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
- Bouton **"Créer CAPA"** sur les lignes rouges

### ⚙️ Gestion du profil
- Photo de profil, modification du nom/email
- Code superviseur avec copie en un clic
- Carte signature numérique avec lien vers `/signature`
- Changement de mot de passe

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

### Signature numérique des rapports
- Le superviseur peut **signer numériquement** un rapport PDF depuis Rapport Libraries
- La signature est empreinte SHA-256 du hash du PDF
- **Audit trail** complet : qui a signé, quand, depuis quelle IP, hash original vs signé
- Vérification de signature : upload d'un PDF signé → affichage de la validité

---

## 7. Module CAPA (détail)

### Objectif
Module **ISO 9001** de gestion des **Actions Correctives et Préventives** (CAPA). Quand une ligne de contrôle est **rouge** (non-conformité), le superviseur crée un CAPA pour analyser la cause racine, assigner des actions et suivre leur résolution.

### Flux complet
```
Ligne rouge détectée (Rapport Tab)
        │
        ▼
Superviseur clique "Créer CAPA"
   1. Remplit le formulaire (titre, type, priorité, date, coût, description)
   2. L'IA Mistral génère automatiquement :
      • Analyse 5 Pourquoi (cause racine)
      • Causes racines identifiées
      • Risque si non traité
      • Actions recommandées
   3. Le CAPA est créé avec statut "ouvert"
   4. Email de notification envoyé
        │
        ▼
Gestion du cycle de vie (stepper 5 étapes) :
   ouvert → en_analyse → en_cours → en_verification → cloture
                                                         ↑
                                            (ou annule à tout moment)
   5. Le superviseur ajoute des actions et les assigne aux agents
   6. Les agents complètent leurs actions (avec preuve)
   7. Quand toutes les actions sont terminées → notification au superviseur
   8. Le superviseur vérifie et clôture le CAPA
   9. Un PDF ISO 9001 est généré avec tout l'historique
```

### Statuts possibles
| Statut | Description |
|---|---|
| `ouvert` | CAPA créé, en attente d'analyse |
| `en_analyse` | Analyse de la cause racine en cours |
| `en_cours` | Actions correctives en cours d'exécution |
| `en_verification` | Vérification de l'efficacité des actions |
| `cloture` | CAPA résolu et vérifié |
| `annule` | CAPA annulé |

### Priorités
| Priorité | Description |
|---|---|
| `faible` | Impact minimal |
| `moyenne` | Impact modéré |
| `haute` | Impact important |
| `critique` | Impact majeur, action immédiate requise |

### Types
| Type | Description |
|---|---|
| `corrective` | Résoudre un problème existant |
| `preventive` | Empêcher un problème futur |
| `les_deux` | Corrective + Préventive |

### Analyse IA (Mistral)
- **5 Pourquoi** : décomposition de la cause racine en 5 niveaux
- **Causes racines** : identification des causes profondes
- **Risque** : conséquence si non traité
- **Actions recommandées** : suggestions d'actions correctives
- Le superviseur peut aussi saisir manuellement la cause racine

### PDF ISO 9001
- Généré via `pdf-lib`
- Contient : en-tête LEONI, infos CAPA, description, cause racine, tableau des actions, historique des statuts, pied de page "ISO 9001"

---

## 8. Module Objectifs Qualité (détail)

### Objectif
Système de gestion des **objectifs qualité** de type **OKR** (Objectives and Key Results) avec moteur de prédiction, suivi en temps réel et système de badges (gamification).

### Fonctionnalités
- **CRUD complet** : créer, modifier, supprimer des objectifs
- **9 catégories** : Conformité, Incidents critiques, Temps d'arrêt, Temps de résolution, Inspections, Productivité, Photos, Formation, Personnalisé
- **4 priorités** : low, medium, high, critical
- **Statuts** : active, completed, failed, at_risk
- **Prédiction** : régression linéaire sur les données historiques → probabilité de succès
- **Niveau de risque** : low, medium, high, critical (basé sur la prédiction)
- **Recommandations** : suggestions automatiques basées sur le risque
- **Badges** : gamification (goal_achieved, three_months_success, best_performance, fast_recovery, quality_champion)

### Dashboard OKR
- **KPIs** : total, actifs, à risque, terminés, échoués, probabilité moyenne
- **Graphiques** :
  - Ligne : évolution mensuelle des objectifs
  - Barres : comparaison 6 derniers mois
  - Camembert : distribution des niveaux de risque
- **Alertes** : notifications push quand un objectif passe en `at_risk`
- **Historique** : suivi quotidien de chaque objectif
- **Prédictions** : pour chaque objectif, affichage de la probabilité de succès

### Moteur de prédiction (sans IA externe)
- **Régression linéaire** sur série cumulée
- **Facteur de confiance** basé sur la volatilité des données
- Pas besoin d'IA externe — calcul mathématique pur

---

## 9. Module Copilote IA (détail)

### Objectif
Assistant IA conversationnel pour les superviseurs qualité. Posez des questions sur vos données et obtenez des réponses contextualisées.

### Fonctionnalités
- **Chat conversationnel** : posez des questions en français
- **Contexte données** : l'IA accède aux données réelles (agents, tendances, rapports)
- **Questions rapides** : boutons prédéfinis (Tendance, Meilleur agent, Critiques, Recommandations)
- **Suggestions** : questions de suivi proposées après chaque réponse
- **Badges contexte** : affichage du nombre de lignes, conformité, minutes d'arrêt

### Modèle IA
- **Fournisseur** : Mistral AI
- **Modèle** : `mistral-large-latest`
- **Température** : 0.3 (réponses précises)
- **Max tokens** : 1000
- **Personnalité** : expert qualité LEONI

### Données contextuelles
- Performance des agents (nombre de lignes, conformité)
- Tendances quotidiennes (7 derniers jours)
- Statistiques 30 jours
- Derniers rapports IA générés

### Frontend
- **CopilotButton** : bouton flottant (FAB) avec icône bot
- **CopilotPanel** : panneau de chat avec historique, questions rapides, suggestions

---

## 10. Module Push Notifications (détail)

### Objectif
Système de **notifications push** via **Web Push VAPID** pour les navigateurs modernes (Chrome, Firefox, Edge, Safari).

### Fonctionnalités
- **Abonnement** : enregistrement du service worker + clé VAPID
- **Préférences** : 7 catégories (alertes critiques, système, rapports IA, objectifs, messages, benchmark, CAPA)
- **Fenêtre DND** : Do Not Disturb (heures de silence)
- **Historique** : toutes les notifications envoyées avec statut
- **Analytics** : taux de livraison, ouverture, clic
- **Groupement** : regroupement des notifications similaires
- **Escalade** : notification non lue → escalade au superviseur → admin (3 niveaux)
- **Nettoyage** : désabonnements >90 jours, historique >180 jours (cron 03:00)

### Catégories de notifications
| Catégorie | Description |
|---|---|
| `quality_critical` | Incident qualité critique |
| `quality_warning` | Avertissement qualité |
| `production_stop` | Arrêt de production |
| `ai_report` | Rapport IA généré |
| `objective_risk` | Objectif à risque |
| `objective_completed` | Objectif terminé |
| `chat_message` | Nouveau message chat |
| `agent_registration` | Nouvel agent inscrit |
| `agent_approved` | Agent approuvé |
| `benchmark` | Alerte benchmark |
| `ai_risk` | Risque IA détecté |
| `capa` | Alerte CAPA |
| `system` | Système |

### Escalade automatique
- **Niveau 0** : notification initiale à l'utilisateur
- **Niveau 1** : après 10 min (critique) / 20 min (haut) / 30 min (moyen) → escalade au superviseur
- **Niveau 2** : après double du délai → escalade au Super Admin
- **Niveau 3** : après triple du délai → alerte maximale

### Rate Limiting
- **RateLimitGuard** : 30 requêtes par minute par route et par utilisateur
- Protection contre les abus (subscribe, test, send)

---

## 11. Module Signature Numérique (détail)

### 11.1 Signature Pad (`/api/signature-pad`)

#### Objectif
Créer et gérer la **signature manuscrite numérique** du superviseur. La signature est analysée par l'IA (Mistral Vision) pour un score de qualité et une vectorisation SVG.

#### Fonctionnalités
- **Upload** : image PNG/JPG ou base64
- **Traitement image** (sharp) : niveaux de gris, normalisation, accentuation, redimensionnement
- **Analyse IA** (Mistral Vision `pixtral-large-latest`) :
  - Score de qualité (0-100)
  - Vectorisation SVG
  - Suggestions d'amélioration
- **Intégration PDF** : la signature est intégrée aux rapports PDF signés
- **Statuts de traitement** : pending → processing → completed/failed

#### Frontend
- **SignaturePage** : page complète avec création/remplacement/suppression
- **SignatureDrawer** : canvas de dessin (couleur, épaisseur, annuler, effacer)

### 11.2 Signature numérique (`/api/signature`)

#### Objectif
**Signer numériquement** les rapports PDF avec traçabilité complète (audit trail).

#### Fonctionnalités
- **Signer** : hash SHA-256 du PDF + signature + thumbprint certificat
- **Vérifier** : upload d'un PDF signé → vérification de la validité
- **Audit trail** : historique complet (SIGN/VERIFY/REVOKE) avec IP, date, hash original vs signé

#### Entité `SignatureAudit`
- `reportId` (UUID)
- `superviseurId`, `signerName`
- `pdfHashOriginal` (SHA-256)
- `pdfHashSigned` (SHA-256)
- `signature`, `timestampToken`, `certificateThumbprint`
- `signedAt`, `action` (SIGN/VERIFY/REVOKE), `ipAddress`

#### Frontend
- **SignatureBadge** : widget dans RapportLibraries — signer/vérifier/audit
- **AuditTrailDrawer** : timeline de l'audit trail

---

## 12. Module Calendrier (détail)

### Objectif
Module de **planification** avec gestion d'événements, assignation de tâches aux agents, récurrence et rappels.

### Fonctionnalités
- **CRUD événements** : créer, modifier, supprimer
- **6 types** : Inspection, Réunion, Audit, Formation, Maintenance, Autre
- **4 priorités** : low, medium, high, critical
- **Assignation** : assigner une tâche à un agent spécifique
- **Récurrence** : quotidien, hebdomadaire, mensuel (avec sélection de jours)
- **Rappels** : 5/10/15/30/60 min avant
- **Couleurs** : 6 couleurs prédéfinies + personalisée
- **Statuts** : pending, in_progress, completed, cancelled, postponed
- **Vue agent** : page "Mes Tâches" avec groupement par semaine

### 4 vues (FullCalendar)
1. **Mois** : vue calendrier mensuelle
2. **Semaine** : vue hebdomadaire
3. **Jour** : vue journalière
4. **Liste** : vue liste des événements

### Frontend
- **CalendarPage** : page complète avec filtres, stats mensuelles, tâches du jour
- **MyTasksPage** : page agent avec tâches assignées
- **EventFormModal** : formulaire riche (type, priorité, dates, agent, récurrence, couleur)
- **EventDetailDrawer** : détail de l'événation avec changement de statut

---

## 13. API Backend — Référence des routes

> Préfixe global : `/api` · Toutes les routes sauf auth requièrent `Authorization: Bearer <token>`

### 🔐 Auth (`/auth`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login matricule ou email |
| POST | `/auth/signup/superviseur-qualite` | Public | Inscription superviseur (approbation requise) |
| POST | `/auth/signup/agent-qualite` | Public | Inscription agent avec code superviseur |
| GET | `/auth/profile` | Auth | Profil de l'utilisateur connecté |
| POST | `/auth/profile/image` | Auth | Upload photo de profil |
| POST | `/auth/logout` | Auth | Déconnexion (journalisée) |
| POST | `/auth/forgot-password` | Public | Envoie l'email de réinitialisation |
| POST | `/auth/reset-password` | Public | Réinitialise le mot de passe (token 15 min) |
| GET | `/auth/agents` | Superviseur | Liste des agents du superviseur |
| POST | `/auth/agents/:agentId/approve` | Superviseur | Approuver un agent |
| POST | `/auth/agents/:agentId/reject` | Superviseur | Rejeter un agent |

### 🏭 Qualité (`/quality`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/quality/controle-dates` | Agent, Superviseur | Dates de contrôle (agents : les leurs) |
| POST | `/quality/controle-dates` | Agent, Superviseur | Créer une date (aujourd'hui ou futur) |
| DELETE | `/quality/controle-dates/:id` | Superviseur | Supprimer une date |
| GET | `/quality/lignes` | Superviseur | Toutes les lignes de ses agents |
| GET | `/quality/lignes/mes-lignes` | Agent | Ses lignes |
| GET | `/quality/lignes/agent/:agentId` | Superviseur | Lignes d'un agent spécifique |
| POST | `/quality/lignes` | Agent, Superviseur | Créer une ligne de contrôle |
| POST | `/quality/lignes/:id/image` | Agent, Superviseur | Upload photo de ligne |
| PATCH | `/quality/lignes/:id` | Agent | Modifier une ligne |
| DELETE | `/quality/lignes/:id` | Agent, Superviseur | Supprimer une ligne |
| GET | `/quality/historique-agents` | Superviseur | Historique de ses agents (tenant) |
| POST | `/quality/rapport` | Agent, Superviseur | Rapport périodique (début/fin, agentId optionnel) |

### 👑 Super Admin (`/super-admin`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/super-admin/stats` | Super Admin | Statistiques globales |
| GET | `/super-admin/users` | Super Admin | Liste des utilisateurs |
| GET | `/super-admin/users/pending` | Super Admin | Utilisateurs en attente |
| POST | `/super-admin/users/:userId/approve` | Super Admin | Approuver un utilisateur |
| POST | `/super-admin/users/:userId/disapprove` | Super Admin | Désapprouver un utilisateur |
| DELETE | `/super-admin/users/:userId` | Super Admin | Supprimer (cascade) |
| GET | `/super-admin/logs` | Super Admin | Logs de connexion paginés |
| GET | `/super-admin/logs/user/:userId` | Super Admin | Logs d'un utilisateur spécifique |

### 💬 Chat (`/chat`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/chat/conversations` | Tous | Conversations (isolées par tenant) |
| GET | `/chat/messages/:userId` | Tous | Historique avec un utilisateur |
| POST | `/chat/read/:senderId` | Tous | Marquer comme lu |
| GET | `/chat/unread-count` | Tous | Nombre de messages non lus |
| GET | `/chat/agents` | Tous | Agents disponibles pour messagerie |
| PATCH | `/chat/messages/:messageId` | Tous | Modifier un message |
| DELETE | `/chat/messages/:messageId` | Tous | Supprimer (soft) un message |

### 🔔 Notifications (`/notifications`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/notifications` | Tous | Liste des notifications |
| GET | `/notifications/unread-count` | Tous | Compteur non lus |
| PATCH | `/notifications/:id/read` | Tous | Marquer comme lue |
| PATCH | `/notifications/read-all` | Tous | Tout marquer comme lu |
| DELETE | `/notifications/:id` | Tous | Supprimer une notification |

### 🖼️ Bibliothèque (`/library`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/library/upload` | Tous | Upload image (max 10 Mo) |
| GET | `/library/images` | Tous | Images (`folderId`, `agentId` — **tenant vérifié**) |
| GET | `/library/trash` | Tous | Images supprimées (corbeille) |
| GET | `/library/stats` | Tous | Statistiques (`agentId` — **tenant vérifié**) |
| PATCH | `/library/images/:id` | Tous | Description / dossier |
| DELETE | `/library/images/:id` | Tous | Corbeille (soft delete) |
| POST | `/library/images/:id/restore` | Tous | Restaurer |
| DELETE | `/library/images/:id/permanent` | Tous | Suppression définitive |
| POST | `/library/move` | Tous | Déplacer plusieurs images |
| POST | `/library/folders` | Tous | Créer un dossier |
| GET | `/library/folders` | Tous | Dossiers (`agentId` — **tenant vérifié**) |
| PATCH | `/library/folders/:id` | Tous | Renommer |
| DELETE | `/library/folders/:id` | Tous | Supprimer un dossier |

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

### 🎯 CAPA (`/capa`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/capa` | Superviseur, Super Admin | Créer un CAPA (appel IA automatique) |
| GET | `/capa` | Superviseur, Super Admin | Liste des CAPAs (filtres : status, priority, type, dates, ligne, agent) |
| GET | `/capa/stats` | Superviseur, Super Admin | Statistiques (ouverts, en retard, clôturés, taux résolution) |
| GET | `/capa/agents` | Superviseur, Super Admin | Agents pour assignation |
| GET | `/capa/:id` | Superviseur, Super Admin | Détail du CAPA |
| PATCH | `/capa/:id/status` | Superviseur, Super Admin | Modifier le statut (machine à états) |
| POST | `/capa/:id/actions` | Superviseur, Super Admin | Ajouter une action |
| PATCH | `/capa/:id/actions/:actionId` | Superviseur, Super Admin | Modifier une action |
| PATCH | `/capa/actions/:actionId/complete` | Agent | Agent termine une action (avec preuve) |
| POST | `/capa/:id/commentaires` | Superviseur, Super Admin, Agent | Ajouter un commentaire |
| GET | `/capa/:id/pdf` | Superviseur, Super Admin | Générer le PDF ISO 9001 |

### 📊 Objectifs Qualité (`/quality-objectives`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/quality-objectives` | Superviseur, Super Admin | Créer un objectif |
| GET | `/quality-objectives` | Tous (scopé par rôle) | Liste des objectifs |
| GET | `/quality-objectives/dashboard` | Tous | Dashboard (KPIs, évolution, risques, badges) |
| GET | `/quality-objectives/predictions` | Tous | Prédictions de succès |
| GET | `/quality-objectives/history` | Tous | Historique quotidien |
| GET | `/quality-objectives/badges` | Tous | Badges débloqués |
| GET | `/quality-objectives/:id` | Tous | Détail d'un objectif |
| PATCH | `/quality-objectives/:id` | Superviseur, Super Admin | Modifier un objectif |
| DELETE | `/quality-objectives/:id` | Superviseur, Super Admin | Supprimer un objectif |

### 🤖 Copilote IA (`/copilot`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/copilot/chat` | Superviseur, Super Admin | Poser une question au copilote IA |

### 🔏 Signature Pad (`/signature-pad`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/signature-pad/upload` | Superviseur, Super Admin | Upload signature (multipart ou base64) |
| GET | `/signature-pad/me` | Superviseur, Super Admin | Obtenir sa signature |
| GET | `/signature-pad/status/:id` | Superviseur, Super Admin | Statut de traitement |
| DELETE | `/signature-pad/me` | Superviseur, Super Admin | Désactiver sa signature |

### ✍️ Signature numérique (`/signature`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/signature/sign/:reportId` | Superviseur, Super Admin | Signer numériquement un rapport PDF |
| POST | `/signature/verify` | Tous | Vérifier la signature d'un PDF |
| GET | `/signature/audit/:reportId` | Superviseur, Super Admin | Audit trail d'un rapport |

### 📅 Calendrier (`/calendar`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/calendar/events` | Superviseur, Super Admin | Liste des événements (filtre dates) |
| POST | `/calendar/events` | Superviseur, Super Admin | Créer un événement / assigner une tâche |
| GET | `/calendar/events/stats` | Superviseur, Super Admin | Statistiques mensuelles |
| GET | `/calendar/events/my-tasks` | Tous | Tâches assignées à l'utilisateur |
| GET | `/calendar/events/:id` | Superviseur, Super Admin | Détail d'un événement |
| PATCH | `/calendar/events/:id` | Superviseur, Super Admin | Modifier un événement |
| PATCH | `/calendar/events/:id/complete` | Tous | Marquer une tâche terminée |
| DELETE | `/calendar/events/:id` | Superviseur, Super Admin | Supprimer un événement |
| GET | `/calendar/notifications` | Tous | Notifications calendrier |
| PATCH | `/calendar/notifications/read` | Tous | Marquer comme lu |

### 🔔 Push Notifications (`/push`)
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/push/vapid-public-key` | Tous | Clé publique VAPID |
| POST | `/push/subscribe` | Tous (+RateLimit) | S'abonner aux push |
| POST | `/push/unsubscribe` | Tous | Se désabonner |
| POST | `/push/test` | Tous (+RateLimit) | Envoyer une notification test |
| POST | `/push/send` | Super Admin (+RateLimit) | Envoyer une notification ciblée |
| GET | `/push/history` | Tous | Historique des notifications (paginé) |
| GET | `/push/settings` | Tous | Préférences + abonnements |
| PATCH | `/push/settings` | Tous | Modifier les préférences |
| POST | `/push/status` | Tous (+RateLimit) | Rapport de livraison/ouverture/clic |
| GET | `/push/analytics` | Tous | Analytics (Super Admin voit tout) |
| GET | `/push/escalation` | Tous | Config d'escalade |
| PATCH | `/push/escalation` | Super Admin | Modifier la config d'escalade |
| POST | `/push/escalation/run` | Super Admin | Déclencher manuellement l'escalade |

---

## 14. Base de données — Entités

### Tables d'authentification
| Table | Entité | Rôles / clés notables |
|---|---|---|
| `users` | User | `role` (enum), `isApproved`, `isApprovedBySuperviseur`, `superviseurCode`, `superviseurId` (FK tenant), `profileImage`, `resetToken` + expiration |
| `login_logs` | LoginLog | `user` (FK), `action` (login/logout), `ipAddress`, `userAgent`, `loggedAt` |

### Tables qualité
| Table | Entité | Rôles / clés notables |
|---|---|---|
| `controle_dates` | ControleDate | `dateControle`, `isActive`, `createdBy` |
| `lignes_controle` | LigneControle | `nomLigne`, `heure`, `note` (vert/jaune/rouge), `delais`, `responsable`, `details`, `image`, `controleDate` (FK), `agent` (FK) |

### Tables rapports
| Table | Entité | Rôles / clés notables |
|---|---|---|
| `daily_reports` | DailyReport | `superviseur` (FK), `reportDate`, `summary`, `kpis` (jsonb), `aiAnalysis`, `recommendations`, `status`, `emailSentAt`, `emailRecipient`, `errorMessage`, `isSigned`, `signedAt`, `signatureHash`, `signerName` |
| `report_recipients` | ReportRecipient | `superviseurId` (FK) + `email`, **unique (superviseurId, email)** |

### Tables CAPA
| Table | Entité | Rôles / clés notables |
|---|---|---|
| `capa` | Capa | `reference` (unique), `ligneControleId`, `nomLigne`, `superviseurId`, `titre`, `description`, `status` (enum 6 états), `priority` (4 niveaux), `type`, `causeRacine`, `causeRacineIA` (JSON Mistral), `dateEcheance`, `dateOuverture`, `dateCloture`, `coutEstime` |
| `capa_action` | CapaAction | `capaId` (FK CASCADE), `titre`, `description`, `type`, `responsableId`, `status` (4 états), `completedAt`, `preuve` |
| `capa_commentaire` | CapaCommentaire | `capaId` (FK), `auteurId`, `contenu`, `type` (enum 4 types), `ancienStatut`, `nouveauStatut` |

### Tables objectifs qualité
| Table | Entité | Rôles / clés notables |
|---|---|---|
| `quality_objectives` | QualityObjective | `title`, `description`, `category` (9 catégories), `targetValue`, `currentValue`, `unit`, `progress`, `status`, `priority`, `predictionProbability`, `riskLevel`, `recommendation`, `createdBy` (FK) |
| `objective_badges` | ObjectiveBadge | `code` (5 types), `name`, `user` (FK), `objective` (FK nullable), `unlockedAt`, **unique (user, code)** |
| `objective_history` | ObjectiveHistory | `objective` (FK CASCADE), `value`, `progress`, `probability`, **unique (objective, recordedAt)** |

### Tables notifications push
| Table | Entité | Rôles / clés notables |
|---|---|---|
| `push_notification_history` | PushNotificationHistory | `user` (FK), `title`, `body`, `category` (13 types), `priority`, `data` (jsonb), `deliveryStatus`, `groupKey`, `escalationLevel` (0-3) |
| `push_subscriptions` | PushSubscription | `user` (FK), `endpoint` (unique), `p256dh`, `auth`, `browser`, `platform`, `isActive` |
| `notification_preferences` | NotificationPreferences | `user` (OneToOne), 7 catégories on/off, `soundEnabled`, `vibrationEnabled`, `dndEnabled`, `dndStart`, `dndEnd`, `capaAlerts` |
| `notification_analytics` | NotificationAnalytics | `user` (FK), `date`, `sent`, `delivered`, `opened`, `clicked`, **unique (user, date)** |
| `push_system_config` | PushSystemConfig | `criticalEscalationMin`, `highEscalationMin`, `mediumEscalationMin`, `groupingWindowMin`, `enabled` |

### Tables signature
| Table | Entité | Rôles / clés notables |
|---|---|---|
| `superviseur_signature` | SuperviseurSignature | `superviseurId` (unique), `originalImageBase64`, `enhancedImageBase64`, `svgPath`, `quality`, `processingStatus` |
| `signature_audit` | SignatureAudit | `reportId`, `superviseurId`, `pdfHashOriginal` (SHA-256), `pdfHashSigned` (SHA-256), `signature`, `action` (SIGN/VERIFY/REVOKE), `ipAddress` |

### Tables calendrier
| Table | Entité | Rôles / clés notables |
|---|---|---|
| `calendar_events` | CalendarEvent | `title`, `type` (6 types), `priority`, `startDate`, `endDate`, `superviseurId`, `assignedToId`, `status` (5 états), `isRecurring`, `recurrenceRule`, `reminderMinutes`, `color` |
| `event_notifications` | EventNotification | `eventId` (FK), `recipientId`, `type` (ASSIGNED/REMINDER/UPDATED/CANCELLED/COMPLETED), `isRead` |

### Tables chat
| Table | Entité | Rôles / clés notables |
|---|---|---|
| `messages` | Message | `sender` (FK), `receiver` (FK), `content`, `isRead`, `isEdited`, `isDeleted` |

### Tables bibliothèque
| Table | Entité | Rôles / clés notables |
|---|---|---|
| `library_images` | LibraryImage | `url`, `filename`, `originalName`, `mimeType`, `fileSize`, `description`, `uploadedBy` (FK), `folder` (FK), `isDeleted`, `deletedAt` |
| `library_folders` | ImageFolder | `name`, `createdBy` (FK) |

> `synchronize: true` : les tables sont créées/mises à jour automatiquement au démarrage du backend.

---

## 15. Installation et démarrage

### Prérequis
- Node.js **≥ 22** (requis par Vite 8)
- PostgreSQL 16 (ou Docker)
- npm ≥ 10

### Sans Docker (développement)
```bash
# 1. Backend
cd backend
npm install
# configurer backend/.env (voir section 16)
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

## 16. Variables d'environnement

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
| `MISTRAL_API_KEY` | (clé API) | Clé API Mistral AI (copilot, CAPA, signatures) |
| `VAPID_PUBLIC_KEY` | (clé publique) | Clé publique VAPID pour Web Push |
| `VAPID_PRIVATE_KEY` | (clé privée) | Clé privée VAPID pour Web Push |
| `VAPID_SUBJECT` | `mailto:xxx@gmail.com` | Sujet VAPID (email contact) |

---

## 17. Docker

### `backend/docker-compose.yml`
- **db** : `postgres:16-alpine`, base `qualite_db`, exposé sur `127.0.0.1:5432`
- **backend** : build via Dockerfile, port `3000:3000`

### `backend/Dockerfile`
- Build en 2 étapes (node:20-alpine) → utilisateur non-root `appuser`
- Au démarrage : exécute le seed du Super Admin puis lance l'application

---

## 18. Structure du projet

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
│   │   ├── copilot/             # assistant IA conversationnel (Mistral)
│   │   ├── capa/                # actions correctives/préventives (ISO 9001)
│   │   ├── quality-objectives/  # objectifs qualité OKR + prédiction + badges
│   │   ├── push-notification/   # Web Push VAPID, préférences, escalade, analytics
│   │   ├── signature-pad/       # signature manuscrite numérique + IA
│   │   ├── signature/           # signature PDF numérique + audit trail
│   │   ├── calendar/            # événements, tâches, récurrence, rappels
│   │   ├── mail/                # SMTP générique (reset password)
│   │   └── database/            # seed
│   └── uploads/                 # fichiers uploadés (servis statiquement)
├── front/
│   ├── index.html
│   └── src/
│       ├── api/index.ts         # client axios (authAPI, qualityAPI, capaAPI, ...)
│       ├── types/index.ts       # types TypeScript
│       ├── contexts/AuthContext.tsx
│       ├── hooks/
│       │   ├── useCalendar.ts
│       │   ├── usePushNotifications.ts
│       │   ├── useSocket.ts
│       │   ├── useNotificationSocket.ts
│       │   ├── useAlert.tsx
│       │   └── useConfirm.tsx
│       ├── utils/clipboard.ts   # copie avec fallback mobile
│       ├── utils/text.ts        # stripEmojis
│       ├── components/
│       │   ├── Chat.tsx
│       │   ├── ImageLibrary.tsx
│       │   ├── RapportLibraries.tsx
│       │   ├── NotificationBell.tsx
│       │   ├── UserProfileDrawer.tsx
│       │   ├── PushSettings.tsx
│       │   ├── Calendar/        # EventFormModal, EventDetailDrawer
│       │   ├── Capa/            # CapaFormModal, CapaDetailDrawer
│       │   ├── Copilot/         # CopilotButton, CopilotPanel
│       │   ├── Signature/       # SignatureBadge, AuditTrailDrawer
│       │   └── UI/              # AlertModal, ConfirmModal
│       ├── pages/
│       │   ├── Auth/            # Login, Signup, ForgotPassword, ResetPassword
│       │   ├── Dashboard/       # Dashboard (superviseur+agent), SuperAdminDashboard
│       │   ├── Calendar/        # CalendarPage, MyTasksPage
│       │   ├── Capa/            # CapaPage
│       │   ├── SignaturePad/    # SignaturePage, SignatureDrawer
│       │   ├── QualityObjectives/ # QualityObjectivesTab
│       │   └── Profile/ProfilePage.tsx
│       └── App.css              # design system complet (responsive)
└── .historique/                 # documentation du projet
```

---

## 19. Fonctionnalités récentes

| Date | Fonctionnalité |
|---|---|
| 2026-08 | **Module CAPA complet** : CRUD, analyse IA Mistral (5 Pourquoi), stepper 5 états, actions assignées aux agents avec preuve, commentaires, PDF ISO 9001, bouton "Créer CAPA" sur lignes rouges |
| 2026-08 | **Module Objectifs Qualité (OKR)** : 9 catégories, moteur de prédiction (régression linéaire), badges gamification, dashboard avec 3 graphiques |
| 2026-08 | **Copilote IA** : assistant conversationnel Mistral, contexte données réelles, questions rapides, suggestions |
| 2026-08 | **Push Notifications Web Push** : VAPID, 7 préférences, DND, escalade automatique (3 niveaux), analytics, rate limiting |
| 2026-08 | **Signature Numérique** : signature manuscrite (canvas + IA Mistral Vision), score qualité, vectorisation SVG, signaturation PDF SHA-256, audit trail complet |
| 2026-08 | **Module Calendrier** : FullCalendar 4 vues, 6 types d'événements, assignation de tâches, récurrence, rappels, page "Mes Tâches" agent |
| 2026-08 | **Destinataires additionnels des rapports IA** : le superviseur ajoute des emails ; le rapport quotidien (18h00) est envoyé à son email **+ en CC** à tous les destinataires |
| 2026-08 | **Isolation tenant bibliothèque** : `getImages` / `getFolders` / `getStats` vérifient que l'agent demandé appartient bien au superviseur |
| 2026-08 | **Refonte responsive de la bibliothèque d'images** : sidebar horizontale, grille 2 colonnes, modales bottom-sheet |
| — | Chat WhatsApp-style, rapports IA complets (cron, PDF, email), navigation mobile, etc. |

---

## 20. Comptes par défaut

| Rôle | Email | Mot de passe | Matricule |
|---|---|---|---|
| Super Admin | `gaith.ghanmi@gmail.com` | `adminUser123*` | `SUPER-ADMIN-001` |

> Les superviseurs et agents s'inscrivent via l'écran d'inscription. Le Super Admin approuve les superviseurs ; chaque superviseur approuve ses agents.
