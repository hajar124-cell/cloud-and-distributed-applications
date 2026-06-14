# Rapport d'Intégration OpenClaw — CampusOps
## Orchestration des workflows académiques
### Université Euromed de Fès — 2024/2025

---

## 1. Présentation d'OpenClaw dans CampusOps

**OpenClaw** est utilisé comme moteur d'orchestration externe. Il déclenche des workflows métier via des appels HTTP (webhooks) vers l'API CampusOps, permettant d'automatiser les tâches récurrentes sans intervention manuelle.

**Principe d'intégration :**
```
OpenClaw scheduler
       │
       ▼  HTTP POST + x-openclaw-secret
CampusOps API (/api/openclaw/*)
       │
       ├─► Email SMTP (Nodemailer)
       ├─► Notifications in-app (table notifications)
       └─► Logs (Winston + table audit_logs)
```

**Sécurité :** chaque webhook est protégé par un header `x-openclaw-secret` vérifié côté API. Sans ce secret, le webhook retourne 401.

---

## 2. Architecture des flux OpenClaw

```
┌─────────────────────────────────────────────────────────┐
│                    OPENCLAW SCHEDULER                    │
│                                                          │
│  Workflow 1: Daily Planning  → CRON: 0 7 * * 1-6        │
│  Workflow 2: Payment Check   → CRON: 0 9 * * 1          │
│  Workflow 3: Absence Alert   → TRIGGER: on absence       │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP POST
                             │ Header: x-openclaw-secret
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   CAMPUSOPS API (Node.js)                │
│                                                          │
│  POST /api/openclaw/daily-planning                       │
│  POST /api/openclaw/payment-reminders                    │
│  POST /api/openclaw/absence-alert                        │
│  GET  /api/openclaw/status                               │
└────┬──────────────────┬────────────────────┬────────────┘
     │                  │                    │
     ▼                  ▼                    ▼
  SMTP Email      Notification DB       Audit Log
  (Nodemailer)    (PostgreSQL)          (Winston)
```

---

## 3. Workflows implémentés

### Workflow 1 — Envoi du planning journalier

**Endpoint :** `POST /api/openclaw/daily-planning`

**Déclencheur OpenClaw :** Cron `0 7 * * 1-6` (Lun-Sam à 7h00, fuseau `Africa/Casablanca`)

**Fallback interne :** Même cron configuré directement dans `app.ts` via `node-cron`

**Flux d'exécution :**
```
1. Requête POST reçue avec header x-openclaw-secret
2. Vérification du secret (comparaison directe)
3. Requête DB : toutes les sessions du jour (date = aujourd'hui)
   └─ Include : module, teacher (email, prénom), group, room
4. Regroupement par enseignant
5. Pour chaque enseignant ayant des cours aujourd'hui :
   └─ Si email configuré :
      └─ Génération du HTML du planning (tableau Euromed Fès)
      └─ Envoi SMTP via Nodemailer
      └─ Log dans email_logs (OUTBOUND)
6. Réponse : { sent: N, results: [...emails envoyés] }
```

**Données envoyées dans l'email :**
- Nom de l'enseignant
- Date du jour (locale fr-FR)
- Tableau : Horaire | Module | Groupe | Salle
- Design brandé : couleurs Euromed Fès (#1E3A5F, #C8A951)

**Cas d'erreur :**
- SMTP non configuré → log warning, pas d'email envoyé
- Aucune session aujourd'hui → réponse success avec `sent: 0`
- Secret invalide → 401 Unauthorized

---

### Workflow 2 — Rappels paiements en retard

**Endpoint :** `POST /api/openclaw/payment-reminders`

**Déclencheur OpenClaw :** Cron `0 9 * * 1` (chaque lundi à 9h00)

**Fallback interne :** Même cron dans `app.ts`

**Flux d'exécution :**
```
1. Requête POST reçue avec header x-openclaw-secret
2. Vérification du secret
3. Requête DB : paiements avec status IN ['IMPAYE', 'PARTIEL']
   ET dueDate < maintenant
   └─ Include : student (email, firstName, lastName)
4. Pour chaque paiement en retard :
   ├─ Créer notification in-app (type: PAIEMENT)
   │  └─ Titre: "Paiement en retard"
   │  └─ Corps: libellé + montant MAD
   └─ Si student.email :
      └─ Envoyer email de rappel (Nodemailer)
         └─ Montant, libellé, date d'échéance
5. Réponse : { overdueCount: N, notified: N }
```

**Notification générée :**
```json
{
  "type": "PAIEMENT",
  "title": "Paiement en retard",
  "body": "Votre paiement \"Frais de scolarité S1\" d'un montant de 15000 MAD est en retard."
}
```

---

### Workflow 3 — Alerte d'absence

**Endpoint :** `POST /api/openclaw/absence-alert`

**Déclencheur OpenClaw :** Trigger événementiel déclenché lors de l'enregistrement d'une absence dans le système tiers ou directement via webhook.

**Note :** Dans CampusOps, ce workflow est aussi déclenché automatiquement lors du `POST /api/absences/record` pour chaque étudiant absent/en retard.

**Corps de la requête :**
```json
{
  "studentId": "uuid-de-l-etudiant",
  "sessionId": "uuid-de-la-session",
  "status": "ABSENT"
}
```

**Flux d'exécution :**
```
1. Requête POST reçue avec header x-openclaw-secret
2. Vérification du secret
3. Si status == ABSENT ou RETARD :
   └─ Créer notification in-app pour l'étudiant
      └─ Type: ABSENCE
      └─ Titre: "Absence signalée"
      └─ Corps: mention du statut (absent/retard)
4. Réponse : { message: "Alerte absence traitée" }
```

---

## 4. Double mécanisme de déclenchement

CampusOps implémente une **redondance** entre OpenClaw et les crons internes :

| Tâche | OpenClaw (webhook) | Cron interne (node-cron) |
|-------|-------------------|--------------------------|
| Planning journalier | `POST /api/openclaw/daily-planning` | `0 7 * * 1-6` |
| Rappels paiements | `POST /api/openclaw/payment-reminders` | `0 9 * * 1` |
| Alerte absence | `POST /api/openclaw/absence-alert` | Via `POST /api/absences/record` |

**Avantage :** Si OpenClaw est indisponible, les crons internes prennent le relais. Si les crons internes ne sont pas souhaités, ils peuvent être désactivés et OpenClaw gère seul l'orchestration.

---

## 5. Configuration OpenClaw

### Variables d'environnement requis (backend/.env)

```env
OPENCLAW_SECRET=votre-secret-securise-ici
```

### Configuration dans l'interface OpenClaw

Créer 3 workflows HTTP avec :

**Headers communs :**
```
Content-Type: application/json
x-openclaw-secret: <valeur de OPENCLAW_SECRET>
```

**Workflow 1 - Daily Planning**
- Type : HTTP Request
- Method : POST
- URL : `http://votre-serveur:5000/api/openclaw/daily-planning`
- Schedule : `0 7 * * 1-6` (Lun-Sam 7h00 Casablanca)

**Workflow 2 - Payment Reminders**
- Type : HTTP Request
- Method : POST
- URL : `http://votre-serveur:5000/api/openclaw/payment-reminders`
- Schedule : `0 9 * * 1` (Lundi 9h00 Casablanca)

**Workflow 3 - Absence Alert (événementiel)**
- Type : HTTP Request (Webhook trigger)
- Method : POST
- URL : `http://votre-serveur:5000/api/openclaw/absence-alert`
- Body :
```json
{
  "studentId": "{{studentId}}",
  "sessionId": "{{sessionId}}",
  "status": "{{status}}"
}
```

---

## 6. Monitoring et logs

- Chaque appel webhook est loggé via Winston : `[OpenClaw] Déclenchement: ...`
- Erreurs loggées dans `backend/logs/error.log`
- Vérifier le statut de l'API : `GET /api/openclaw/status`

```json
{
  "status": "online",
  "version": "1.0.0",
  "webhooks": [
    { "path": "/api/openclaw/daily-planning", "description": "..." },
    { "path": "/api/openclaw/payment-reminders", "description": "..." },
    { "path": "/api/openclaw/absence-alert", "description": "..." }
  ],
  "timestamp": "2025-06-10T07:00:00.000Z"
}
```

---

## 7. Tests des webhooks

Exemples de tests avec `curl` :

```bash
# Test planning journalier
curl -X POST http://localhost:5000/api/openclaw/daily-planning \
  -H "x-openclaw-secret: votre-secret" \
  -H "Content-Type: application/json"

# Test rappels paiements
curl -X POST http://localhost:5000/api/openclaw/payment-reminders \
  -H "x-openclaw-secret: votre-secret" \
  -H "Content-Type: application/json"

# Test alerte absence
curl -X POST http://localhost:5000/api/openclaw/absence-alert \
  -H "x-openclaw-secret: votre-secret" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"uuid","sessionId":"uuid","status":"ABSENT"}'

# Statut OpenClaw
curl http://localhost:5000/api/openclaw/status
```

---

*Rapport rédigé dans le cadre du projet de fin de semestre — Université Euromed de Fès, 2024/2025*
