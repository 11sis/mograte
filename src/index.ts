import { createMigration } from './create';
import { getDelta, listMigrations, migrateDown, migrateUp, resetMigrationsTable } from './migrate';
import { writeMogrationConfig } from './init';
import { runHelp } from './help';
import { Config } from './config';
export * from './types';
export * from './classes';

export const runStuff = async () => {
  await Config.init();

  const argv = require('minimist')(process.argv.slice(2));
  const [command, positional,] = argv._;

  if (argv.help || argv.h || (command || '').toLowerCase() === 'help') {
    return runHelp();
  }
  if (!command) {
    await migrateUp();
  }
  if (command === 'init') {
    await writeMogrationConfig();
  }
  if (command === 'list') {
    await listMigrations();
  }
  if (command === 'up') {
    await migrateUp((positional || '').toString());
  }
  if (command === 'down') {
    await migrateDown((positional || '').toString());
  }
  if (command === 'nuclear') {
    await resetMigrationsTable();
  }
  if (command === 'delta') {
    const delta = await getDelta();
    console.log(delta);
  }
  if (command === 'create') {
    createMigration(positional);
  }
  if (command === 'refresh' || command === 'reset') {
    await migrateDown();
    await migrateUp();
  }
}
