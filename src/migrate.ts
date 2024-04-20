import { Migrator } from "./classes/migrator"

export const migrateUp = async (number?: string) => {
    return new Migrator('up').migrateAsync('Migrations are up to date', number);
}

export const migrateDown = (number?: string) => {
    return new Migrator('down').migrateAsync('Nothing to migrate down', number);
}

export const resetMigrationsTable = () => {
  return new Migrator('nuclear').migrateAsync('No migration records to reset');
}

export const listMigrations = () => {
    return new Migrator('').statusMigrations();
}

export const getDelta = () => {
    return new Migrator('').getDelta();
}