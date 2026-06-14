# Diagramme ERD — CampusOps
## Modèle Entité-Relation

---

## Diagramme Mermaid

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string password
        string firstName
        string lastName
        string role
        string phone
        boolean isActive
        string telegramChatId UK
        string telegramOtp
        datetime otpExpiresAt
        string resetToken
        datetime resetTokenExpiry
        datetime createdAt
        datetime updatedAt
    }

    Student {
        string id PK
        string userId FK UK
        string studentId UK
        string groupId FK
        string parentId FK
    }

    RefreshToken {
        string id PK
        string token UK
        string userId FK
        datetime expiresAt
        datetime createdAt
    }

    Group {
        string id PK
        string name UK
        string level
        string filiere
        int capacity
        datetime createdAt
    }

    Module {
        string id PK
        string code UK
        string name
        string description
        int credits
        int volumeHours
        int semester
        boolean isActive
    }

    Chapter {
        string id PK
        string moduleId FK
        string title
        int order
        string description
    }

    Room {
        string id PK
        string name UK
        int capacity
        string building
        string type
    }

    Session {
        string id PK
        string moduleId FK
        string teacherId FK
        string groupId FK
        string roomId FK
        datetime date
        string startTime
        string endTime
        string type
        string notes
        datetime createdAt
        datetime updatedAt
    }

    Absence {
        string id PK
        string studentId FK
        string sessionId FK
        string groupId FK
        string status
        string justification
        datetime justifiedAt
        datetime recordedAt
        string recordedBy
    }

    Payment {
        string id PK
        string studentId FK
        string label
        float amount
        datetime dueDate
        datetime paidAt
        string status
        string method
        string reference
        string notes
        datetime createdAt
        datetime updatedAt
    }

    Progress {
        string id PK
        string moduleId FK
        string groupId FK
        string studentId FK
        int chaptersTotal
        int chaptersDone
        float percentage
        datetime lastUpdated
        string notes
    }

    Notification {
        string id PK
        string userId FK
        string type
        string title
        string body
        boolean isRead
        string metadata
        datetime createdAt
    }

    EmailLog {
        string id PK
        string messageId UK
        string fromAddress
        string toAddress
        string subject
        string preview
        string body
        string direction
        datetime processedAt
        datetime createdAt
    }

    AuditLog {
        string id PK
        string userId
        string action
        string resource
        string details
        string ipAddress
        datetime createdAt
    }

    User ||--o{ Student : "est étudiant"
    User ||--o{ RefreshToken : "possède"
    User ||--o{ Session : "enseigne (teacherSessions)"
    User ||--o{ Absence : "a des absences"
    User ||--o{ Payment : "a des paiements"
    User ||--o{ Progress : "suit (studentProgress)"
    User ||--o{ Notification : "reçoit"
    User ||--o{ Student : "parent de (parentOf)"

    Student }o--|| Group : "appartient à"
    Student }o--o| User : "parent"

    Group ||--o{ Session : "participe à"
    Group ||--o{ Absence : "a des absences"
    Group ||--o{ Progress : "avancement du groupe"

    Module ||--o{ Session : "cours du module"
    Module ||--o{ Chapter : "contient"
    Module ||--o{ Progress : "avancement du module"

    Room ||--o{ Session : "lieu du cours"

    Session ||--o{ Absence : "absences de la session"
```

---

## Description des entités

### User
Table centrale. Contient tous les utilisateurs (Admin, Scolarité, Enseignant, Étudiant). La colonne `role` détermine les permissions. Champs `telegramChatId` et `telegramOtp` gèrent l'intégration Telegram. Champs `resetToken` / `resetTokenExpiry` pour la réinitialisation du mot de passe.

### Student
Extension de User pour les étudiants. Contient le numéro étudiant (`studentId`), l'appartenance au groupe, et optionnellement un lien vers le parent (pour les notifications).

### RefreshToken
Stockage des tokens de rafraîchissement JWT. Permet la rotation des tokens et la révocation à la déconnexion.

### Group
Groupe d'étudiants (ex: GI1-A, GL3-A). Associé à une filière et un niveau.

### Module
Matière enseignée. Possède des chapitres (pour le suivi pédagogique), des crédits ECTS et un volume horaire.

### Chapter
Chapitre d'un module. Utilisé pour calculer le pourcentage d'avancement.

### Room
Salle de cours (amphithéâtre, salle TD, laboratoire) avec capacité et bâtiment.

### Session
Séance de cours planifiée. Clé de jonction entre Module, User (enseignant), Group et Room. Contient date, horaire et type (CM/TD/TP/Examen).

### Absence
Présence/Absence/Retard d'un étudiant à une session. Contrainte d'unicité sur (studentId, sessionId). Supporte la justification textuelle.

### Payment
Paiement de frais de scolarité. Statuts : PAYE / PARTIEL / IMPAYE. La date `dueDate` permet de détecter les retards automatiquement.

### Progress
Avancement pédagogique par (module, groupe). `studentId` null = avancement du groupe entier. Calculé via chaptersTotal / chaptersDone.

### Notification
Centre de notifications in-app. Types : PLANNING, ABSENCE, PAIEMENT, SYSTEME, EMAIL_ENTRANT.

### EmailLog
Journal des emails entrants (IMAP) et sortants (SMTP). Champ `direction` : INBOUND / OUTBOUND.

### AuditLog
Journal des actions administratives (optionnel, à utiliser pour la conformité RGPD).

---

## Index et contraintes notables

| Table | Contrainte/Index |
|-------|-----------------|
| User | email UNIQUE, telegramChatId UNIQUE |
| Student | userId UNIQUE, studentId UNIQUE |
| RefreshToken | token UNIQUE |
| Group | name UNIQUE |
| Module | code UNIQUE |
| Room | name UNIQUE |
| Absence | (studentId, sessionId) UNIQUE |
| EmailLog | messageId UNIQUE |
| Progress | INDEX (moduleId, groupId) |

---

*Modèle généré pour CampusOps — Université Euromed de Fès, 2024/2025*
