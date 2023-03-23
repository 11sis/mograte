import { logger } from '../logger';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config';
import { MigrationContext } from './migration-context';
import { MigrationFile } from './migration-file';
// import stripJsonTrailingCommas from 'strip-json-trailing-commas';
const webpack = require('webpack');

export class Migrator {
  private orderedMigrationFiles: MigrationFile[] = [];
  private noRemainingMigrations = false;
  private migrationsDir: string; 
  private tmpdir: string;

  constructor(
    private kind: string,
    private context = new MigrationContext()
  ) {
    this.migrationsDir = path.resolve(process.cwd(), config.migrationsDir);
    this.tmpdir = path.resolve(this.migrationsDir, '.tmp');

    if (!fs.existsSync(this.migrationsDir)) {
      logger.info(`${this.migrationsDir} does not exist. Creating it.`);
      fs.mkdirSync(this.migrationsDir, { recursive: true });
    }

    process.on('exit', () => {
      if (fs.existsSync(this.tmpdir) && !config.keepJS) {
        fs.rmSync(this.tmpdir, { force: true, recursive: true });
      }
    });
  }

  private get isUp() {
    return (this.kind || '').toLowerCase() === 'up';
  }
    
  private getMigrationUpperBound(numberOrMigration?: string): number {
    let index = 0;
    /**
     * if numberOrMigration is a file name or part of a file name,
     *   - get the numeric value from the front of the file name
     *   - use that number to find the file that contains that numeric value
     *   - set the return index to the index of that file
     **/ 
    if ( numberOrMigration && isNaN(Number(numberOrMigration)) ) { //
      let [migIndex,] = numberOrMigration.replace(`.${config.language}`, '').split('_');
      let matches = this.orderedMigrationFiles.filter((f) => ~f.file.indexOf(migIndex));
      if (matches.length === 1) { 
        index = this.orderedMigrationFiles.map((f) => f.file).indexOf(matches[0].file) + 1;
      }
    } else if (numberOrMigration) { // input is presumed a number
      const theNum = Math.max(0, Number(numberOrMigration)); // set to 0 if negative
      index = theNum === 0 ? this.orderedMigrationFiles.length : theNum;
    } else {
      index = this.orderedMigrationFiles.length;
    }
    return index;
  }

  private async transpileTsFile(file): Promise<string> {
    const webpackConfig = require(path.resolve(__dirname, '../templates/webpack.config'));
    const tsFile = path.resolve(this.migrationsDir, file);
    const jsFile = path.resolve(this.migrationsDir, '.tmp', file.replace('.ts', '.js'))
    webpackConfig.entry = tsFile;
    webpackConfig.output.path = this.tmpdir;
    webpackConfig.output.filename = file.replace('.ts', '.js');

    return new Promise((resolve, reject) => {
      webpack(webpackConfig, (error, stats) => {
        if (error || stats.hasErrors()) {
          return reject({ error, stats });
        }
        resolve(jsFile);
      });
    })

  }

  private async getOrderedMigrationDirectoryContents (): Promise<MigrationFile[]> {

    const migrationFiles = fs.readdirSync(this.migrationsDir, { withFileTypes: true })
      .filter(item => !item.isDirectory() && ~item.name.indexOf(`.${config.language}`))
      .map(item => {
        const num = item.name.split('_')[0];
        return {
          file: item.name,
          i: !isNaN(Number(num)) ? Number(num) : item.name
        }
      })
      .sort((a, b) => (a.i===b.i) ? 0 : ((a.i < b.i) ? -1 : 1));

    const orderedMigrations = await Promise.all(
      (migrationFiles || [])
      .map(async (p) => {
        const pk = p.i as number;
        const [,name] = p.file.replace(`.${config.language}`, '').split('_');
        let modulePath = path.resolve(process.cwd(), config.migrationsDir, p.file);

        let module;
        try {
          if (config.language === 'ts') {
            modulePath = await this.transpileTsFile(p.file);
          }
          
          module = require(modulePath);
        } catch(ex: any) {
          logger.error(ex.message, ex.stack);
          logger.info('TypeScript error; check your code and try again.');
          logger.info('................Nothing migrated................');
          return process.exit(1);
        }
        const { up, down } = module.default ? module.default : module;
        return Promise.resolve(new MigrationFile(pk, name || '', [up, down], p.file));
      }));

    return this.isUp ? (orderedMigrations as any) : orderedMigrations.reverse();
  }

  private async getMigrationsRecordsRecursiveAsync (params: any, itemsCollector = []): Promise<{Items: any[], Count: number, ScannedCount: number, LastEvaluatedKey?: any }> {
    const migrationResponse = await this.context.item.getAllAsync(params);
    if (migrationResponse.LastEvaluatedKey) {
      return this.getMigrationsRecordsRecursiveAsync({ ...params, ExclusiveStartKey: migrationResponse.LastEvaluatedKey }, migrationResponse.Items);
    }
    return Promise.resolve({ ...migrationResponse, Items: [ ...migrationResponse.Items, ...itemsCollector] });
  }

  private async getMigrationsRecordsAsync (isList = false): Promise<any[]> {
    const tableExists = await this.context.table.existsAsync(config.migrationsTableDef.TableName);
    if (!tableExists && !isList) {
      // we are running a migration
      await this.context.table.createAsync(config.migrationsTableDef);
      return Promise.resolve([]);
    } else if (!tableExists) {
      // we are listing remaining migrations for a table that doesnt exist yet
      return Promise.resolve([]);
    }
    
    const migrationResponse = await this.getMigrationsRecordsRecursiveAsync({ TableName: config.migrationsTableDef.TableName });
    const sortedMigrations = migrationResponse.Items.sort((a, b) => (a.file===b.file) ? 0 : ((a.file < b.file) ? -1 : 1));

    return Promise.resolve(this.isUp ? sortedMigrations: sortedMigrations.reverse());
  }

  private getOutOfSyncMigrations(orderedMigrationRecords: MigrationFile[]): boolean {
    for (let i = 0; i < orderedMigrationRecords.length; i++) {
      if (this.orderedMigrationFiles[i].file !== orderedMigrationRecords[i].file) {
        return true;
      }
    }

    return false;
  }

  private getOutOfSyncRecordsMessage(migrationRecords: MigrationFile[]) {
    const files = this.orderedMigrationFiles.map((m) => m.file);
    const expected = [ ...migrationRecords.map((m) => m.file), '{ remaining migrations }' ]
    return [
      ``,
      `Migrations are out of sync.\n`,
      `  - expected: ${JSON.stringify(expected)}`,
      `  - got: ${JSON.stringify(files)}`,
      ``,
      `Files or records were manually changed, or something failed along the way.`,
      ``,
      `Try running 'refresh' or 'reset' to re-sync migrations and BE CAREFUL.`,
      ``
    ].join('\n\t');
  } 

  private async getActionableMigrationsAsync (numberOrMigrationToStopAt?: string): Promise<MigrationFile[]> { //files: any[], records: any[]) {

    // get all migration records from db
    const migrationRecords = [ ...(await this.getMigrationsRecordsAsync()) ];

    // files should match record sequentially for all records
    const outOfSyncRecords = this.getOutOfSyncMigrations(migrationRecords);

    // if files and records dont match sequentially, we're out of sync, die
    if (outOfSyncRecords) {
      logger.error(this.getOutOfSyncRecordsMessage(migrationRecords));
      return process.exit(1);
    }

    // get the migration to stop at
    const migrationIndex = this.getMigrationUpperBound(numberOrMigrationToStopAt);

    // get migrations from 0 to stop point
    const boundedMigrationFiles = [ ...this.orderedMigrationFiles.slice(0, migrationIndex) ];


    const actionableMigrations: any[] = [];
    while(boundedMigrationFiles.length) {
      const migrationFile = boundedMigrationFiles.shift();
      const record = migrationRecords.shift();
      if (this.isUp) {
        // if there is a migration file, and the migration file doesn't match the record, add to actionable migrations
        if ((migrationFile && !record) || (migrationFile && (migrationFile.file !== record.file))) {
          actionableMigrations.push(migrationFile);
        }
      } else {
        // if there is a migration file and the file doesn't match the record, add to actionable migrations
        if ((migrationFile && record) && (migrationFile.file === record.file)) {
          actionableMigrations.push(migrationFile);
        } else if (record) {
          migrationRecords.push(record);
        }
      }
    }
    if (!this.isUp && !migrationRecords.length) {
      this.noRemainingMigrations = true;
    }
    return Promise.resolve(actionableMigrations);
  }

  async runMigrations(migrations: MigrationFile[]) {
    const writeMigrationRecord = async (migration: MigrationFile) => {
      return this.context.item.writeAsync({
          id: migration.date,
          name: migration.name,
          runDate: Date.now(),
          runBy: config.user(),
          file: migration.file,
        }, 
        config.migrationsTableDef.TableName
      );
    }
    const deleteMigrationRecord = async (migration: MigrationFile) => {
      return this.context.item.deleteAsync(migration.date, config.migrationsTableDef.TableName);
    }

    const migrateFunc = this.isUp ? 0 : 1;
    for(let i= 0; i< migrations.length; i++) {
      const migration = migrations[i];
      
      try {

        await migration.funcs[migrateFunc](this.context);

      } catch(ex: any) {
        logger.error(`There was a **problem** running your **${this.kind}** migration: ${migration.file}`);
        logger.error(ex.stack);
        process.exit(1);
      }

      try {
        this.isUp ? 
          await writeMigrationRecord(migration):
          await deleteMigrationRecord(migration);
        
        logger.log(`${this.kind} : ${migration.file}`);
      } catch(ex: any) {
        logger.error(`There was a **problem** recording your migration to the db: ${migration.file}`);
        logger.error(ex.stack);
        process.exit(1);
      }

    }

    if (this.noRemainingMigrations) {
      await this.cleanUpMigrations();
    }

    logger.log(`migration : complete`);
  }

  async getDelta (): Promise<number> {
    const boundedMigrations = [ ...this.orderedMigrationFiles ];
    const migrationRecords = [ ...(await this.getMigrationsRecordsAsync()) ];
    let total = 0;
    while(boundedMigrations.length) {
      const migrationFile = boundedMigrations.shift();
      const record = migrationRecords.shift();
      if ((migrationFile && !record) || (migrationFile && (migrationFile.file !== record.file))) {
        total+=1;
      }
    }
    return Promise.resolve(total)
  }

  async statusMigrations (): Promise<void> {
    const boundedMigrations = [ ...this.orderedMigrationFiles ];
    const migrationRecords = [ ...(await this.getMigrationsRecordsAsync(true)) ];
    if (!boundedMigrations.length) {
      logger.info(`No migrations. Create some.`);
    }
    while(boundedMigrations.length) {
      const migrationFile = boundedMigrations.shift();
      const record = migrationRecords.shift();
      if ((migrationFile && !record) || (migrationFile && (migrationFile.file !== record.file))) {
        logger.info(`**${migrationFile.file}** has not been migrated`);
      } else if (migrationFile) {
        logger.log(`**${migrationFile.file}** migrated on **${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(record.runDate))}** by **${record.runBy}**`);
      }
    }
    return Promise.resolve();
  }

  async cleanUpMigrations(): Promise<any> {
    return this.context.table.deleteAsync(config.migrationsTableDef.TableName);
  }

  async migrateAsync(message: string, numberOrMigration?: string): Promise<any> {
    this.orderedMigrationFiles = await this.getOrderedMigrationDirectoryContents();
    // get any migrations in boundedMigrations that have not been run yet
    const remainingMigrations = await this.getActionableMigrationsAsync(numberOrMigration);

    if (!remainingMigrations.length) {
      logger.info(`**...No work...**`);
      logger.log(message);
      process.exit();
    }

    return this.runMigrations(remainingMigrations);
  }

}
