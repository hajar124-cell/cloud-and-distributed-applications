import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CampusOps API',
      version: '1.0.0',
      description: 'API de gestion académique - Université Euromed de Fès. Gestion du planning, absences, paiements, avancement pédagogique, bot Telegram et email IMAP/SMTP.',
      contact: { name: 'CampusOps Support', email: 'admin@euromed-fes.ma' },
    },
    servers: [
      { url: 'http://localhost:5000/api', description: 'Développement local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenu via POST /auth/login',
        },
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@euromed-fes.ma' },
            password: { type: 'string', example: 'Admin@2025!' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                role: { type: 'string', enum: ['ADMIN', 'SCOLARITE', 'ENSEIGNANT', 'ETUDIANT'] },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'SCOLARITE', 'ENSEIGNANT', 'ETUDIANT'] },
            phone: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Session: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            date: { type: 'string', format: 'date' },
            startTime: { type: 'string', example: '08:00' },
            endTime: { type: 'string', example: '10:00' },
            type: { type: 'string', enum: ['CM', 'TD', 'TP', 'Examen'] },
            module: { type: 'object', properties: { name: { type: 'string' }, code: { type: 'string' } } },
            teacher: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' } } },
            group: { type: 'object', properties: { name: { type: 'string' } } },
            room: { type: 'object', nullable: true, properties: { name: { type: 'string' } } },
          },
        },
        Absence: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string', enum: ['PRESENT', 'ABSENT', 'RETARD'] },
            justification: { type: 'string', nullable: true },
            recordedAt: { type: 'string', format: 'date-time' },
            session: { $ref: '#/components/schemas/Session' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            amount: { type: 'number' },
            dueDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['PAYE', 'PARTIEL', 'IMPAYE'] },
            paidAt: { type: 'string', format: 'date-time', nullable: true },
            method: { type: 'string', nullable: true },
          },
        },
        Progress: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            percentage: { type: 'number', minimum: 0, maximum: 100 },
            chaptersDone: { type: 'integer' },
            chaptersTotal: { type: 'integer' },
            lastUpdated: { type: 'string', format: 'date-time' },
            module: { type: 'object', properties: { name: { type: 'string' }, code: { type: 'string' } } },
            group: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['PLANNING', 'ABSENCE', 'PAIEMENT', 'SYSTEME', 'EMAIL_ENTRANT'] },
            title: { type: 'string' },
            body: { type: 'string' },
            isRead: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/auth/login': {
        post: {
          tags: ['Authentification'],
          summary: 'Connexion utilisateur',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
          responses: {
            200: { description: 'Connexion réussie', content: { 'application/json': { schema: { properties: { data: { $ref: '#/components/schemas/LoginResponse' } } } } } },
            401: { description: 'Identifiants invalides', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Authentification'],
          summary: 'Renouveler le token d\'accès',
          requestBody: { required: true, content: { 'application/json': { schema: { properties: { refreshToken: { type: 'string' } }, required: ['refreshToken'] } } } },
          responses: { 200: { description: 'Token renouvelé' }, 401: { description: 'Token invalide' } },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Authentification'],
          summary: 'Déconnexion',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Déconnexion réussie' } },
        },
      },
      '/auth/profile': {
        get: {
          tags: ['Authentification'],
          summary: 'Profil de l\'utilisateur connecté',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Profil utilisateur', content: { 'application/json': { schema: { properties: { data: { $ref: '#/components/schemas/User' } } } } } },
          },
        },
      },
      '/auth/forgot-password': {
        post: {
          tags: ['Authentification'],
          summary: 'Demande de réinitialisation de mot de passe',
          requestBody: { required: true, content: { 'application/json': { schema: { properties: { email: { type: 'string', format: 'email' } }, required: ['email'] } } } },
          responses: { 200: { description: 'Email envoyé (si l\'adresse existe)' } },
        },
      },
      '/auth/reset-password': {
        post: {
          tags: ['Authentification'],
          summary: 'Réinitialiser le mot de passe avec token',
          requestBody: { required: true, content: { 'application/json': { schema: { properties: { token: { type: 'string' }, password: { type: 'string', minLength: 8 } }, required: ['token', 'password'] } } } },
          responses: { 200: { description: 'Mot de passe réinitialisé' }, 400: { description: 'Token invalide ou expiré' } },
        },
      },
      '/auth/telegram-otp': {
        post: {
          tags: ['Authentification'],
          summary: 'Générer un code OTP pour lier le bot Telegram',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Code OTP (valide 10 min)', content: { 'application/json': { schema: { properties: { data: { properties: { otp: { type: 'string' } } } } } } } } },
        },
      },
      '/users': {
        get: {
          tags: ['Utilisateurs'],
          summary: 'Liste des utilisateurs (ADMIN/SCOLARITE)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'role', in: 'query', schema: { type: 'string', enum: ['ADMIN', 'SCOLARITE', 'ENSEIGNANT', 'ETUDIANT'] } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Liste paginée des utilisateurs' } },
        },
        post: {
          tags: ['Utilisateurs'],
          summary: 'Créer un utilisateur (ADMIN)',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { properties: { email: { type: 'string' }, password: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' }, role: { type: 'string' }, groupId: { type: 'string' } }, required: ['email', 'password', 'firstName', 'lastName', 'role'] } } } },
          responses: { 201: { description: 'Utilisateur créé' }, 409: { description: 'Email déjà utilisé' } },
        },
      },
      '/users/groups': {
        get: { tags: ['Utilisateurs'], summary: 'Liste des groupes', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Liste des groupes' } } },
        post: { tags: ['Utilisateurs'], summary: 'Créer un groupe (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { properties: { name: { type: 'string' }, level: { type: 'string' }, filiere: { type: 'string' }, capacity: { type: 'integer' } }, required: ['name', 'level', 'filiere'] } } } }, responses: { 201: { description: 'Groupe créé' } } },
      },
      '/users/rooms': {
        get: { tags: ['Utilisateurs'], summary: 'Liste des salles', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Liste des salles' } } },
        post: { tags: ['Utilisateurs'], summary: 'Créer une salle (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { properties: { name: { type: 'string' }, capacity: { type: 'integer' }, building: { type: 'string' }, type: { type: 'string' } }, required: ['name', 'capacity'] } } } }, responses: { 201: { description: 'Salle créée' }, 409: { description: 'Salle déjà existante' } } },
      },
      '/users/modules': {
        get: { tags: ['Utilisateurs'], summary: 'Liste des modules', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Liste des modules avec chapitres' } } },
        post: { tags: ['Utilisateurs'], summary: 'Créer un module (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { properties: { code: { type: 'string' }, name: { type: 'string' }, credits: { type: 'integer' }, volumeHours: { type: 'integer' }, semester: { type: 'integer' } }, required: ['code', 'name', 'semester'] } } } }, responses: { 201: { description: 'Module créé' } } },
      },
      '/users/stats/dashboard': {
        get: { tags: ['Utilisateurs'], summary: 'Statistiques globales du tableau de bord (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Stats: utilisateurs, paiements, absences, cours' } } },
      },
      '/planning/today': {
        get: { tags: ['Planning'], summary: 'Planning du jour', security: [{ bearerAuth: [] }], parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'Séances du jour' } } },
      },
      '/planning/week': {
        get: { tags: ['Planning'], summary: 'Planning de la semaine', security: [{ bearerAuth: [] }], parameters: [{ name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'Séances de la semaine' } } },
      },
      '/planning': {
        post: {
          tags: ['Planning'],
          summary: 'Créer une séance (ADMIN/SCOLARITE)',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { properties: { moduleId: { type: 'string' }, teacherId: { type: 'string' }, groupId: { type: 'string' }, roomId: { type: 'string' }, date: { type: 'string', format: 'date' }, startTime: { type: 'string', example: '08:00' }, endTime: { type: 'string', example: '10:00' }, type: { type: 'string', enum: ['CM', 'TD', 'TP', 'Examen'] } }, required: ['moduleId', 'teacherId', 'groupId', 'date', 'startTime', 'endTime'] } } } },
          responses: { 201: { description: 'Séance créée' } },
        },
      },
      '/planning/{id}': {
        put: { tags: ['Planning'], summary: 'Modifier une séance (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Séance mise à jour' } } },
        delete: { tags: ['Planning'], summary: 'Supprimer une séance (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Séance supprimée' } } },
      },
      '/absences/record': {
        post: {
          tags: ['Absences'],
          summary: 'Enregistrer présences/absences (ADMIN/SCOLARITE/ENSEIGNANT)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { properties: { sessionId: { type: 'string' }, records: { type: 'array', items: { properties: { studentId: { type: 'string' }, status: { type: 'string', enum: ['PRESENT', 'ABSENT', 'RETARD'] } } } } }, required: ['sessionId', 'records'] } } },
          },
          responses: { 200: { description: 'Absences enregistrées, notifications envoyées' } },
        },
      },
      '/absences/student/{studentId}': {
        get: { tags: ['Absences'], summary: 'Absences d\'un étudiant', security: [{ bearerAuth: [] }], parameters: [{ name: 'studentId', in: 'path', schema: { type: 'string' } }, { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'Liste des absences' } } },
      },
      '/absences/stats/{studentId}': {
        get: { tags: ['Absences'], summary: 'Statistiques d\'absences', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Total, mois, justifiées, par statut' } } },
      },
      '/absences/export/csv': {
        get: { tags: ['Absences'], summary: 'Exporter les absences en CSV (ADMIN/SCOLARITE/ENSEIGNANT)', security: [{ bearerAuth: [] }], parameters: [{ name: 'groupId', in: 'query', schema: { type: 'string' } }, { name: 'studentId', in: 'query', schema: { type: 'string' } }, { name: 'startDate', in: 'query', schema: { type: 'string' } }, { name: 'endDate', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Fichier CSV', content: { 'text/csv': {} } } } },
      },
      '/payments/all': {
        get: { tags: ['Paiements'], summary: 'Tous les paiements (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['PAYE', 'PARTIEL', 'IMPAYE'] } }], responses: { 200: { description: 'Liste paginée des paiements' } } },
      },
      '/payments/stats': {
        get: { tags: ['Paiements'], summary: 'Statistiques paiements (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Total, payé, partiel, impayé, montants' } } },
      },
      '/payments/overdue': {
        get: { tags: ['Paiements'], summary: 'Paiements en retard (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paiements dépassés' } } },
      },
      '/payments/reminders': {
        post: { tags: ['Paiements'], summary: 'Envoyer rappels aux étudiants en retard (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Rappels envoyés' } } },
      },
      '/payments/export/csv': {
        get: { tags: ['Paiements'], summary: 'Exporter les paiements en CSV (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Fichier CSV', content: { 'text/csv': {} } } } },
      },
      '/payments': {
        post: { tags: ['Paiements'], summary: 'Créer un paiement (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { properties: { studentId: { type: 'string' }, label: { type: 'string' }, amount: { type: 'number' }, dueDate: { type: 'string', format: 'date' } }, required: ['studentId', 'label', 'amount', 'dueDate'] } } } }, responses: { 201: { description: 'Paiement créé' } } },
      },
      '/progress/all': {
        get: { tags: ['Avancement'], summary: 'Avancement de tous les groupes (ADMIN/SCOLARITE)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Liste des progressions' } } },
      },
      '/progress/group/{groupId}': {
        get: { tags: ['Avancement'], summary: 'Avancement d\'un groupe', security: [{ bearerAuth: [] }], parameters: [{ name: 'groupId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Progression par module pour ce groupe' } } },
      },
      '/progress/update': {
        post: { tags: ['Avancement'], summary: 'Mettre à jour l\'avancement (ADMIN/SCOLARITE/ENSEIGNANT)', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { properties: { moduleId: { type: 'string' }, groupId: { type: 'string' }, chaptersDone: { type: 'integer' }, notes: { type: 'string' } }, required: ['moduleId', 'groupId', 'chaptersDone'] } } } }, responses: { 200: { description: 'Avancement mis à jour' } } },
      },
      '/mail/latest': {
        get: { tags: ['Email'], summary: 'Derniers emails reçus (IMAP)', security: [{ bearerAuth: [] }], parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } }], responses: { 200: { description: '10 derniers emails depuis la base de données' } } },
      },
      '/mail/send': {
        post: { tags: ['Email'], summary: 'Envoyer un email (SMTP)', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { properties: { to: { type: 'string', format: 'email' }, subject: { type: 'string' }, html: { type: 'string' }, text: { type: 'string' } }, required: ['to', 'subject'] } } } }, responses: { 200: { description: 'Email envoyé' }, 500: { description: 'Erreur SMTP' } } },
      },
      '/mail/sync': {
        post: { tags: ['Email'], summary: 'Synchroniser les emails depuis IMAP', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Synchronisation terminée' } } },
      },
      '/notifications': {
        get: { tags: ['Notifications'], summary: 'Mes notifications', security: [{ bearerAuth: [] }], parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }], responses: { 200: { description: 'Liste des notifications avec compteur non lus' } } },
      },
      '/notifications/read-all': {
        patch: { tags: ['Notifications'], summary: 'Marquer toutes les notifications comme lues', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Notifications marquées comme lues' } } },
      },
      '/openclaw/status': {
        get: { tags: ['OpenClaw'], summary: 'Statut et liste des webhooks OpenClaw', responses: { 200: { description: 'Statut, version, webhooks disponibles' } } },
      },
      '/openclaw/daily-planning': {
        post: {
          tags: ['OpenClaw'],
          summary: 'Déclencher l\'envoi du planning du jour aux enseignants',
          description: 'Webhook sécurisé via header `x-openclaw-secret`. Envoie le planning par email à chaque enseignant.',
          parameters: [{ name: 'x-openclaw-secret', in: 'header', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Planning envoyé' }, 401: { description: 'Secret invalide' } },
        },
      },
      '/openclaw/payment-reminders': {
        post: {
          tags: ['OpenClaw'],
          summary: 'Déclencher les rappels de paiements en retard',
          description: 'Webhook sécurisé. Notifie tous les étudiants avec un paiement impayé ou partiel dépassé.',
          parameters: [{ name: 'x-openclaw-secret', in: 'header', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Rappels envoyés' }, 401: { description: 'Secret invalide' } },
        },
      },
      '/openclaw/absence-alert': {
        post: {
          tags: ['OpenClaw'],
          summary: 'Notifier un étudiant d\'une absence (webhook)',
          description: 'Webhook pour déclencher une notification d\'absence depuis OpenClaw.',
          parameters: [{ name: 'x-openclaw-secret', in: 'header', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { properties: { studentId: { type: 'string' }, sessionId: { type: 'string' }, status: { type: 'string', enum: ['ABSENT', 'RETARD'] } } } } } },
          responses: { 200: { description: 'Notification envoyée' } },
        },
      },
      '/health': {
        get: { tags: ['Système'], summary: 'Health check', responses: { 200: { description: 'API opérationnelle' } } },
      },
    },
    tags: [
      { name: 'Authentification', description: 'Login, JWT, refresh token, mot de passe oublié, OTP Telegram' },
      { name: 'Utilisateurs', description: 'CRUD utilisateurs, groupes, salles, modules, stats' },
      { name: 'Planning', description: 'Séances de cours (CRUD, planning du jour/semaine)' },
      { name: 'Absences', description: 'Suivi des présences, statistiques, justifications, export CSV' },
      { name: 'Paiements', description: 'Gestion des frais de scolarité, rappels, export CSV' },
      { name: 'Avancement', description: 'Suivi pédagogique par module et groupe' },
      { name: 'Email', description: 'Lecture IMAP et envoi SMTP sans navigateur' },
      { name: 'Notifications', description: 'Centre de notifications in-app' },
      { name: 'OpenClaw', description: 'Webhooks d\'orchestration pour automatiser les workflows' },
      { name: 'Système', description: 'Health check, infos API' },
    ],
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
