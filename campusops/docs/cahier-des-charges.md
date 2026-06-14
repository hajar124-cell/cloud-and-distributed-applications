# Cahier des Charges — CampusOps
## Projet de fin de semestre — Gestion académique + Automatisation OpenClaw
### Université Euromed de Fès — 2024/2025

---

## 1. Présentation du projet

**CampusOps** est une application web de gestion académique inspirée de Konosys, développée pour l'Université Euromed de Fès. Elle centralise la gestion du planning, des absences, des paiements et de l'avancement pédagogique, tout en intégrant des canaux de communication modernes (bot Telegram, email IMAP/SMTP) et un moteur d'orchestration (OpenClaw).

**Contexte :** Les établissements d'enseignement supérieur ont besoin d'outils numériques centralisés pour coordonner enseignants, étudiants et personnel administratif. Les solutions existantes (Excel, outils isolés) créent des silos de données et des délais de communication.

**Objectif :** Développer une plateforme full-stack complète permettant de gérer tous les aspects académiques d'un établissement avec automatisation des tâches récurrentes.

---

## 2. Périmètre fonctionnel

### 2.1 Module Utilisateurs et Rôles

| Rôle | Droits principaux |
|------|-------------------|
| ADMIN | Accès total : CRUD complet sur toutes les entités |
| SCOLARITE | Gestion planning, absences, paiements, consultation |
| ENSEIGNANT | Saisie des présences, consultation de son planning, mise à jour de l'avancement |
| ETUDIANT | Consultation de son planning, absences, paiements, avancement |

**Fonctionnalités :**
- Création / modification / désactivation d'utilisateurs
- Authentification JWT avec tokens d'accès (2h) et de rafraîchissement (7 jours)
- Réinitialisation du mot de passe par email avec lien sécurisé (token UUID, durée 1h)
- Liaison du compte au bot Telegram via code OTP (6 chiffres, valide 10 min)

### 2.2 Module Planning

- Création / modification / suppression de séances (ADMIN/SCOLARITE)
- Chaque séance associe : module, groupe, enseignant, salle, horaire, type (CM/TD/TP/Examen)
- Vues disponibles : planning du jour, planning de la semaine (Lun-Sam), planning par étudiant, par groupe, par enseignant
- Navigation semaine par semaine avec indicateur jour actuel

### 2.3 Module Absences

- Saisie en masse par session : statut PRESENT / ABSENT / RETARD par étudiant
- Notification automatique de l'étudiant (in-app + email) lors d'une absence enregistrée
- Justification des absences (texte libre) avec date de justification
- Statistiques : total absences, absences du mois en cours, justifiées / non justifiées
- Filtrage par groupe, étudiant, période
- **Export CSV** des absences (en-tête UTF-8 avec BOM)

### 2.4 Module Suivi d'avancement

- Suivi par module et par groupe : chapitres réalisés / total, pourcentage d'avancement
- Visualisation par barre de progression colorée (rouge < 40%, orange 40-75%, vert > 75%)
- Mise à jour par les enseignants et le personnel administratif
- Consultation individuelle pour les étudiants (avancement de leur groupe)
- Historique via champ `lastUpdated`

### 2.5 Module Paiements

- Plan de paiement : inscription, mensualités, frais divers
- Statuts : PAYE / PARTIEL / IMPAYE
- Résumé financier : montant total, encaissé, restant
- Alertes automatiques pour les paiements en retard (cron + OpenClaw)
- **Export CSV** des paiements (admin/scolarité)
- Pas de passerelle de paiement réelle (gestion et suivi uniquement)

### 2.6 Notifications

- Types : PLANNING, ABSENCE, PAIEMENT, SYSTEME, EMAIL_ENTRANT
- Compteur de non-lus affiché dans la barre de navigation
- Marquage comme lu (individuel ou tout marquer)

---

## 3. Intégrations externes

### 3.1 Bot Telegram (obligatoire)

**Authentification :** liaison compte ↔ chat_id via code OTP généré depuis le profil web.

**Commandes implémentées :**

| Commande | Description | Permissions |
|----------|-------------|-------------|
| `/start` | Message de bienvenue ou instructions de liaison | Tous |
| `/link <CODE>` | Lier le compte avec le code OTP | Tous |
| `/today` | Planning du jour (adapté au rôle) | Authentifié |
| `/week` | Planning de la semaine | Authentifié |
| `/absence` | Absences du mois en cours avec stats | Authentifié |
| `/progress` | Avancement pédagogique avec barre visuelle | Authentifié |
| `/help` | Liste des commandes | Tous |

### 3.2 Email IMAP/SMTP (obligatoire)

- **Lecture (IMAP) :** connexion TLS, lecture des N derniers emails, parsing (expéditeur, sujet, date, aperçu, corps)
- **Envoi (SMTP) :** Nodemailer avec templates HTML brandés Euromed Fès
- **Synchronisation :** `POST /api/mail/sync` importe les emails en base et crée des notifications internes selon le contenu (justificatifs, paiements)
- **Stockage :** table `email_logs` pour audit et traçabilité

### 3.3 OpenClaw (orchestration)

3 webhooks sécurisés (header `x-openclaw-secret`) :

| Webhook | Déclencheur | Action |
|---------|-------------|--------|
| `POST /api/openclaw/daily-planning` | Tous les matins (7h, Lun-Sam) | Envoie le planning du jour par email à chaque enseignant |
| `POST /api/openclaw/payment-reminders` | Tous les lundis (9h) | Notifie les étudiants avec paiements en retard |
| `POST /api/openclaw/absence-alert` | Lors d'une absence enregistrée | Crée une notification in-app pour l'étudiant concerné |

Les mêmes actions sont également déclenchées par des **cron jobs internes** (fallback si OpenClaw indisponible).

---

## 4. Exigences techniques

### 4.1 Stack technologique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Backend | Node.js + Express + TypeScript | Node 20+, Express 4.x |
| ORM / BD | Prisma + SQLite (dev) / PostgreSQL (prod) | Prisma 5.x |
| Authentification | JWT (jsonwebtoken) + bcryptjs | JWT 9.x |
| Frontend | React + Vite + TypeScript + Tailwind CSS | React 18, Vite 5 |
| State management | Zustand | 4.x |
| HTTP client | Axios + React Query | TanStack Query v5 |
| Bot | node-telegram-bot-api | 0.64.x |
| Email | Nodemailer (SMTP) + imap + mailparser | — |
| Logs | Winston | 3.x |
| Orchestration | OpenClaw (webhooks HTTP) | — |
| Docs API | Swagger UI + swagger-jsdoc | OpenAPI 3.0 |
| Conteneurs | Docker + Docker Compose | — |

### 4.2 Sécurité

- Mots de passe hashés avec bcrypt (12 rounds)
- JWT avec accès court (2h) + refresh token rotation
- Rate limiting : 200 requêtes / 15 min / IP
- Helmet (headers HTTP sécurisés)
- CORS restreint au domaine frontend
- Validation des entrées (express-validator)
- Permissions granulaires par rôle sur chaque endpoint
- Secret HMAC pour les webhooks OpenClaw

### 4.3 Logging et audit

- Winston pour les logs applicatifs (fichiers `combined.log` + `error.log`)
- Table `audit_logs` pour les actions sensibles
- Table `email_logs` pour la traçabilité des emails

---

## 5. Livrables

| # | Livrable | Format | Statut |
|---|---------|--------|--------|
| 1 | Cahier des charges | Markdown / PDF | ✅ Ce document |
| 2 | Diagramme ERD | Markdown / Mermaid | ✅ `docs/erd.md` |
| 3 | Documentation API | Swagger UI (`/api-docs`) + JSON | ✅ |
| 4 | Code source | Git + README | ✅ |
| 5 | Données de démonstration | `prisma/seed.ts` | ✅ |
| 6 | Rapport intégration OpenClaw | Markdown | ✅ `docs/rapport-openclaw.md` |
| 7 | Démo vidéo | 5-10 min | À réaliser |

---

## 6. Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@euromed-fes.ma | Admin@2025! |
| Scolarité | scolarite@euromed-fes.ma | Scolarite@2025! |
| Enseignant | prof.khalid@euromed-fes.ma | Teacher@2025! |
| Étudiant | yassine.amrani@etud.euromed-fes.ma | Student@2025! |

---

## 7. Contraintes et limites du MVP

- Pas de passerelle de paiement réelle (statuts gérés manuellement)
- WhatsApp non implémenté (optionnel selon l'énoncé)
- Export PDF non implémenté (export CSV disponible)
- L'envoi d'emails nécessite une configuration SMTP valide (Gmail App Password recommandé)
- La lecture IMAP nécessite une boîte email configurée

---

*Document rédigé dans le cadre du projet de fin de semestre — Université Euromed de Fès, 2024/2025*
