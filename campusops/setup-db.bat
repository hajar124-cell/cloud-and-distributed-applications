@echo off
echo ========================================
echo  CampusOps - Initialisation base de donnees
echo ========================================
cd /d "%~dp0backend"
echo.
echo [1/2] Creation de la base SQLite et tables...
npx prisma db push
echo.
echo [2/2] Chargement des donnees de demonstration...
npx tsx prisma/seed.ts
echo.
echo ========================================
echo  Base initialisee avec succes !
echo.
echo  Comptes disponibles :
echo  Admin      : admin@euromed-fes.ma / Admin@2025!
echo  Scolarite  : scolarite@euromed-fes.ma / Scolarite@2025!
echo  Enseignant : prof.khalid@euromed-fes.ma / Teacher@2025!
echo  Etudiant   : yassine.amrani@etud.euromed-fes.ma / Student@2025!
echo ========================================
pause
