// Fix pour la contrainte unique studentId_groupId_studentId dans Progress
// Prisma génère une contrainte unique sur (moduleId, groupId, studentId) pour Progress
// Quand studentId est null, PostgreSQL traite NULL != NULL donc plusieurs lignes avec studentId=NULL sont autorisées
// La contrainte @@unique ne fonctionne pas avec NULL en SQL standard
// Solution: utiliser un identifiant de substitution ou ajouter un index partiel
// Ce fichier est informatif - le seed.ts gère déjà ce cas correctement
