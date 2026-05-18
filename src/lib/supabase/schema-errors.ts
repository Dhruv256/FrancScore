export class MissingDatabaseMigrationError extends Error {
  constructor(
    public readonly tableName: string,
    message?: string,
  ) {
    super(
      message ??
        `Database migration missing: ${tableName} table not found. Please apply the latest Supabase migrations.`,
    );
    this.name = "MissingDatabaseMigrationError";
  }
}

export function isMissingDatabaseMigrationError(
  error: unknown,
): error is MissingDatabaseMigrationError {
  return error instanceof MissingDatabaseMigrationError;
}

export function isMissingTableError(error: unknown, tableName?: string): boolean {
  const value = error as { code?: string; message?: string; details?: string } | null;
  const message = [value?.message, value?.details].filter(Boolean).join(" ");
  const normalized = message.toLowerCase();
  const table = tableName?.toLowerCase();

  return (
    value?.code === "42P01" ||
    value?.code === "PGRST205" ||
    normalized.includes("schema cache") ||
    normalized.includes("could not find the table") ||
    normalized.includes("relation") && normalized.includes("does not exist") ||
    Boolean(table && normalized.includes(table))
  );
}

export function toMissingMigrationError(error: unknown, tableName: string) {
  if (isMissingDatabaseMigrationError(error)) {
    return error;
  }

  if (isMissingTableError(error, tableName)) {
    return new MissingDatabaseMigrationError(tableName);
  }

  return null;
}

export function getDatabaseSetupMessage(tableName: string) {
  return `Database migration missing: ${tableName} table not found. Apply the latest Supabase migration and redeploy if the schema cache still reports it missing.`;
}
