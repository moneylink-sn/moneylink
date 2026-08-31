#!/usr/bin/env bash
# ============================================================================
# MoneyLink — Script Shell de Sauvegarde PostgreSQL par pg_dump
# ============================================================================
set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/moneylink_pg_dump_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "===================================================="
echo "  🛡️ MONEYLINK POSTGRESQL NATIVE DUMP"
echo "===================================================="
echo "  📁 Destination : ${BACKUP_FILE}"

if [ -z "${DATABASE_URL}" ]; then
  echo "⚠️ Variable DATABASE_URL non définie."
  exit 1
fi

echo "📦 Exécution de pg_dump..."
pg_dump "${DATABASE_URL}" --clean --if-exists --no-owner --no-privileges | gzip > "${BACKUP_FILE}"

echo "✅ Sauvegarde compressée terminée avec succès."

# Rétention : supprimer les sauvegardes de plus de 30 jours
echo "🧹 Nettoyage des anciennes archives (>30 jours)..."
find "${BACKUP_DIR}" -name "moneylink_pg_dump_*.sql.gz" -mtime +30 -delete

echo "🎉 Opération achevée."
