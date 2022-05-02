import { logger } from './logger';
import * as path from 'path';
import * as fs from 'fs';

import { config } from './config';

export const createMigration = async (migrationName: string) => {
    const normalizedMigrationName = migrationName ? `_${migrationName}` : '';
    logger.log(`Creating **${migrationName || 'unnamed'}** migration`);
    try {
        if (!migrationName && config.requireMigrationName) {
            logger.error('You must specify migration name');
            process.exit(1);
        }

        const migrationsDir = path.resolve(process.cwd(), config.migrationsDir)
        if (!fs.existsSync(migrationsDir)) {
            fs.mkdirSync(migrationsDir);
        }

        const ext = `.${config.language}`;
        const sourceTemplateFile = path.resolve(__dirname, `templates/${ext}.template`);
        const sourceTemplateContents = fs.readFileSync(sourceTemplateFile);
        const migrationFileName = path.resolve(migrationsDir, `${Date.now()}${normalizedMigrationName}${ext}`);
        fs.writeFileSync(migrationFileName, sourceTemplateContents);
    } catch(ex) {
        logger.error(ex);
        process.exit(1);
    }
}

