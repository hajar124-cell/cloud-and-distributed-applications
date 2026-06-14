# Travaux Pratiques — Cloud Computing

> Université Euromed de Fès | Module : Cloud Computing | 2025/2026

Ce dossier contient les travaux pratiques réalisés dans le cadre du cours **Cloud Computing**, avec un focus sur la conteneurisation Docker et l'orchestration des services.

---

## Contenu

| Fichier | Description |
|---------|-------------|
| `tp1 cloud.pdf` | TP 1 — Introduction au Cloud Computing |
| `tp2 cloud.pdf` | TP 2 — Services et modèles Cloud (IaaS, PaaS, SaaS) |
| `tp3 cloud docker.pdf` | TP 3 — Conteneurisation avec Docker |
| `TP4 cloud docker.pdf` | TP 4 — Docker Compose et orchestration multi-conteneurs |

---

## Concepts abordés

- **Cloud Computing** : modèles de déploiement (public, privé, hybride), modèles de service (IaaS / PaaS / SaaS)
- **Virtualisation** : machines virtuelles vs conteneurs, hyperviseurs
- **Docker** :
  - Images et conteneurs
  - Dockerfile : construction d'images personnalisées
  - Volumes, réseaux, ports
  - Multi-stage builds
- **Docker Compose** :
  - Orchestration de services multiples
  - Variables d'environnement et fichiers `.env`
  - Dépendances entre services (`depends_on`)
  - Déploiement de stack complète (base de données + backend + frontend)

---

## Application pratique

Ces concepts sont mis en œuvre dans le projet **CampusOps** qui utilise Docker Compose pour orchestrer :
- Un service **PostgreSQL** (base de données)
- Un service **Backend** (Node.js/Express)
- Un service **Frontend** (React/Nginx)

[Voir le projet CampusOps →](../campusops/README.md)

---

## Liens utiles

- [Retour au dépôt principal](../README.md)
- [Documentation Docker officielle](https://docs.docker.com)

---

*Université Euromed de Fès — 2025/2026*
