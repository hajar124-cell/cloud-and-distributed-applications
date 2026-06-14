# Cloud & Distributed Applications

> Projets et travaux pratiques — Université Euromed de Fès | 2025/2026

Ce dépôt regroupe l'ensemble des projets et TPs réalisés dans le cadre des cours **Applications Distribuées** et **Cloud Computing**.

---

## Structure du dépôt

```
cloud-and-distributed-applications/
│
├── campusops/              # Projet full-stack — Gestion académique universitaire
│   ├── backend/            #   Node.js + Express + TypeScript + Prisma + PostgreSQL
│   ├── frontend/           #   React + Vite + TypeScript + Tailwind CSS
│   ├── docs/               #   Cahier des charges, ERD, rapport OpenClaw
│   └── docker-compose.yml  #   Orchestration Docker
│
├── app-dis/                # Travaux pratiques — Applications Distribuées
│   ├── tp1-app-dis.pdf
│   ├── tp2-app-dis.pdf
│   ├── tp3-app-dis.pdf
│   └── Rapport_Seance5_Systemes_Distribues.docx
│
└── cloud/                  # Travaux pratiques — Cloud Computing & Docker
    ├── tp1-cloud.pdf
    ├── tp2-cloud.pdf
    ├── tp3-cloud-docker.pdf
    └── tp4-cloud-docker.pdf
```

---

## Projets

### CampusOps — Gestion Académique

Plateforme web complète de gestion académique inspirée de Konosys, développée pour l'Université Euromed de Fès.

**Fonctionnalités principales :**
- Gestion du planning des séances (CM, TD, TP, Examen)
- Suivi des absences et export CSV
- Suivi des paiements avec alertes automatiques
- Avancement pédagogique par module/groupe
- Bot Telegram intégré (`/today`, `/week`, `/absence`, `/progress`)
- Notifications email IMAP/SMTP
- Orchestration avec OpenClaw (webhooks)
- Déploiement Docker avec Docker Compose

**Stack :** Node.js · Express · TypeScript · PostgreSQL · Prisma · React · Vite · Tailwind CSS · Docker

[Voir le README complet →](./campusops/README.md)

---

### Travaux Pratiques — Applications Distribuées

TPs couvrant les concepts fondamentaux des systèmes distribués :

| Fichier | Contenu |
|---------|---------|
| `tp1-app-dis.pdf` | TP 1 — Introduction aux systèmes distribués |
| `tp2-app-dis.pdf` | TP 2 — Communication distribuée |
| `tp3-app-dis.pdf` | TP 3 — Coordination et synchronisation |
| `Rapport_Seance5_Systemes_Distribues.docx` | Rapport — Séance 5 |

[Voir le dossier →](./app-dis/README.md)

---

### Travaux Pratiques — Cloud Computing

TPs couvrant les concepts du cloud et la conteneurisation avec Docker :

| Fichier | Contenu |
|---------|---------|
| `tp1-cloud.pdf` | TP 1 — Introduction au Cloud |
| `tp2-cloud.pdf` | TP 2 — Services Cloud |
| `tp3-cloud-docker.pdf` | TP 3 — Docker : conteneurisation |
| `tp4-cloud-docker.pdf` | TP 4 — Docker Compose & orchestration |

[Voir le dossier →](./cloud/README.md)

---

## Technologies utilisées

| Catégorie | Technologies |
|-----------|-------------|
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Base de données | PostgreSQL, SQLite (dev) |
| Frontend | React, Vite, TypeScript, Tailwind CSS, Zustand |
| DevOps | Docker, Docker Compose, Nginx |
| Sécurité | JWT, bcrypt, Helmet, Rate limiting |
| Intégrations | Telegram Bot API, Nodemailer, IMAP, OpenClaw |
| Documentation | Swagger/OpenAPI 3.0 |

---

## Auteur

**Hajar Belghali** — Université Euromed de Fès  
Module : Cloud & Applications Distribuées — 2025/2026

---

*Projet académique — tous droits réservés.*
