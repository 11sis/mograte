import { DynamoTableDefinition } from "./dynamo-table-definition"

export type AWSProfileConfig = {
    profile: string,
}

export type AWSConfig = {
    secretAccessKey: string,
    accessKeyId: string,
    region: string,
}

export type MograteConfig = {
    language: 'js'|'ts',
    requireMigrationName?: boolean,
    migrationsDir: string,
    migrationsTable: string | DynamoTableDefinition,
    migrationsTableDef: DynamoTableDefinition,
    awsConfig: AWSConfig | AWSProfileConfig,
    user: Function
    skipValidation?: boolean
}