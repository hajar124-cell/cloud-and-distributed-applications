# CampusOps — Gestion Académique Universitaire
### Université Euromed de Fès

Plateforme de gestion académique complète : planning, absences, paiements, avancement pédagogique, bot Telegram, email IMAP/SMTP, et intégration OpenClaw.

---

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Backend | Node.js + Express + TypeScript |
| Base de données | PostgreSQL + Prisma ORM |
| Authentification | JWT (access + refresh tokens) |
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Bot | Telegram Bot API |
| Email | Nodemailer (SMTP) + imap (lecture) |
| Orchestration | OpenClaw (webhooks) |
| Conteneurs | Docker + Docker Compose |

---

## Démarrage rapide

### 1. Prérequis

- Node.js 20+
- PostgreSQL 15+ (ou Docker)
- (Optionnel) Token bot Telegram depuis [@BotFather](https://t.me/botfather)

### 2. Cloner et installer

```bash
# Backend
cd backend
cp .env.example .env
# Remplir les variables dans .env
npm install
```

```bash
# Frontend
cd frontend
cp .env.example .env
npm install
```

### 3. Base de données

```bash
cd backend

# Créer la base et appliquer le schéma
npx prisma db push

# Charger les données de démonstration
npm run db:seed
```

### 4. Lancer en développement

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:5000/api
- **Health check** : http://localhost:5000/api/health

---

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@euromed-fes.ma | Admin@2026! |
| Scolarité | scolarite@euromed-fes.ma | Scolarite@2026! |
| Enseignant | prof.khalid@euromed-fes.ma | Teacher@2026! |
| Étudiant | yassine.amrani@etud.euromed-fes.ma | Student@2026! |

---

## Lancement avec Docker

```bash
# À la racine du projet
cp backend/.env.example backend/.env
# Modifier backend/.env

docker-compose up -d

# Appliquer le schéma et seeder
docker-compose exec backend npx prisma db push
docker-compose exec backend npm run db:seed
```

- **Frontend** : http://localhost:3000
- **Backend** : http://localhost:5000
- **PostgreSQL** : localhost:5432

---

## Configuration Email (IMAP/SMTP)

Pour Gmail, activez "Mots de passe d'application" dans votre compte Google :
1. Compte Google → Sécurité → Authentification 2 facteurs
2. Bas de page → Mots de passe d'application → Créer

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre@gmail.com
SMTP_PASS=xxxx_xxxx_xxxx_xxxx  # App password

IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=votre@gmail.com
IMAP_PASS=xxxx_xxxx_xxxx_xxxx
```

---

## Bot Telegram

1. Créer un bot avec [@BotFather](https://t.me/botfather) → `/newbot`
2. Copier le token dans `.env` : `TELEGRAM_BOT_TOKEN=...`
3. L'utilisateur va sur son Profil → "Générer OTP"
4. Envoie `/link <CODE>` au bot
5. Commandes disponibles : `/today` `/week` `/absence` `/progress` `/help`

---

## Intégration OpenClaw

Configurer dans OpenClaw les webhooks HTTP avec le header :
```
x-openclaw-secret: <valeur de OPENCLAW_SECRET dans .env>
```

| Webhook | Méthode | URL |
|---------|---------|-----|
| Planning journalier | POST | `http://votre-serveur/api/openclaw/daily-planning` |
| Rappels paiements | POST | `http://votre-serveur/api/openclaw/payment-reminders` |
| Alerte absence | POST | `http://votre-serveur/api/openclaw/absence-alert` |

**Planification automatique intégrée :**
- Tous les matins (Lun–Sam) à 7h → envoi planning du jour aux enseignants
- Tous les lundis à 9h → vérification et rappels paiements en retard

---

## Documentation API

La documentation Swagger/OpenAPI complète est disponible à :
- **Interface interactive :** http://localhost:5000/api-docs
- **JSON brut :** http://localhost:5000/api-docs.json

## API Endpoints principaux

```
POST /api/auth/login              - Connexion
POST /api/auth/refresh            - Renouveler token
POST /api/auth/forgot-password    - Mot de passe oublié (envoi email)
POST /api/auth/reset-password     - Réinitialiser mot de passe (token)
GET  /api/auth/profile            - Profil utilisateur
POST /api/auth/telegram-otp       - Générer OTP Telegram

GET  /api/users                   - Liste utilisateurs (admin/scolarité)
POST /api/users                   - Créer utilisateur
GET  /api/users/groups            - Liste groupes
POST /api/users/groups            - Créer groupe
GET  /api/users/rooms             - Liste salles
POST /api/users/rooms             - Créer salle (ADMIN/SCOLARITE)
GET  /api/users/modules           - Liste modules
POST /api/users/modules           - Créer module
GET  /api/users/stats/dashboard   - Stats globales tableau de bord

GET  /api/planning/today          - Planning du jour
GET  /api/planning/week           - Planning de la semaine
POST /api/planning                - Créer une séance
PUT  /api/planning/:id            - Modifier une séance
DELETE /api/planning/:id          - Supprimer une séance

POST /api/absences/record         - Enregistrer présences/absences
GET  /api/absences/student/:id    - Absences d'un étudiant
GET  /api/absences/group/:id      - Absences d'un groupe
GET  /api/absences/stats/:id      - Statistiques absences
PATCH /api/absences/:id/justify   - Justifier une absence
GET  /api/absences/export/csv     - Export CSV absences

GET  /api/payments/all            - Liste paiements (admin)
GET  /api/payments/stats          - Statistiques paiements
GET  /api/payments/overdue        - Paiements en retard
POST /api/payments/reminders      - Envoyer rappels
GET  /api/payments/export/csv     - Export CSV paiements
POST /api/payments                - Créer paiement
PATCH /api/payments/:id/status    - Mettre à jour statut

GET  /api/progress/all            - Avancement tous groupes
GET  /api/progress/group/:id      - Avancement d'un groupe
GET  /api/progress/student/:id    - Avancement d'un étudiant
POST /api/progress/update         - Mettre à jour avancement

GET  /api/mail/latest             - 10 derniers emails (depuis DB)
POST /api/mail/send               - Envoyer un email (SMTP)
POST /api/mail/sync               - Synchroniser depuis IMAP

GET  /api/notifications           - Mes notifications
PATCH /api/notifications/read-all - Tout marquer comme lu

GET  /api/openclaw/status              - Statut OpenClaw
POST /api/openclaw/daily-planning      - Déclencher planning journalier
POST /api/openclaw/payment-reminders   - Déclencher rappels paiements
POST /api/openclaw/absence-alert       - Alerte absence (webhook)

GET  /api/health                  - Health check
```

---

## Structure du projet

```
campusops/
├── backend/
│   ├── src/
│   │   ├── app.ts              # Point d'entrée + cron jobs
│   │   ├── bots/
│   │   │   └── telegram.bot.ts # Bot Telegram
│   │   ├── controllers/        # Auth, Planning, Absences, Payments...
│   │   ├── middleware/         # Auth JWT, Error handler
│   │   ├── routes/             # Routes Express
│   │   ├── services/           # Logique métier
│   │   └── utils/              # Logger, Prisma, Response helpers
│   └── prisma/
│       ├── schema.prisma       # Modèle de données
│       └── seed.ts             # Données de démonstration
├── frontend/
│   └── src/
│       ├── pages/              # Dashboard, Planning, Absences, Payments...
│       ├── components/         # Layout, Sidebar, Header
│       ├── services/           # API client (axios)
│       └── store/              # Auth store (Zustand)
└── docker-compose.yml
```

---

## Sécurité

- Mots de passe hashés avec bcrypt (12 rounds)
- JWT avec refresh token rotation
- Rate limiting (200 req/15min par IP)
- Helmet pour les headers HTTP sécurisés
- CORS configuré pour le domaine frontend
- Permissions granulaires par rôle (ADMIN > SCOLARITE > ENSEIGNANT > ETUDIANT)
- Protection CSRF via token secret OpenClaw

---

## Documents du projet

| Document | Fichier |
|----------|---------|
| Cahier des charges | [`docs/cahier-des-charges.md`](docs/cahier-des-charges.md) |
| Diagramme ERD | [`docs/erd.md`](docs/erd.md) |
| Rapport intégration OpenClaw | [`docs/rapport-openclaw.md`](docs/rapport-openclaw.md) |
| Documentation API (Swagger) | http://localhost:5000/api-docs |

---

*© 2025/2026 CampusOps — Université Euromed de Fès. Développé par Hajar Belghali dans le cadre d'un projet académique.*
