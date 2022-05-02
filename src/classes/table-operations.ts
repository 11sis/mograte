import { DynamoTableDefinition } from "../types";
import { Operation } from "./operation";

export class TableOperations extends Operation {
    constructor(
        private ddb: any
    ) {
        super();
    }
    private async waitForTableExistanceAsync (tableName: string, exists: boolean): Promise<void> {
        return new Promise((resolve, reject) => {
            const params = { TableName: tableName };
            this.ddb.waitFor(exists ? 'tableExists' : 'tableNotExists', params, (err: any) => {
                if (err) return reject(err);
                resolve();
            })
        });
    }

    async waitForExistAsync (tableName: string): Promise<void> {
        return this.waitForTableExistanceAsync(tableName, true);
    }

    async waitForNotExistAsync (tableName: string): Promise<void> {
        return this.waitForTableExistanceAsync(tableName, false);
    }

    async existsAsync (tableName: string): Promise<any> {
        return new Promise((resolve) => {
            const params = { TableName: tableName };
            this.ddb.describeTable(params, (err: any, data: any) => {
                if (err) return resolve(false);
                resolve(data);
            });
        });
    }

    async createAsync (tableDefinition: DynamoTableDefinition): Promise<any> {
        const tableCreatorAsync = async () => {
            return new Promise((resolve, reject) => {
                this.ddb.createTable(tableDefinition, (err: any, data: any) => {
                    if (err) return reject(err);    
                    resolve(data);
                });
            });
        }

        return this.safeRunAsync(
            `There was a **problem** creating table ${tableDefinition.TableName} ...`,
            async () => {
                await this.waitForNotExistAsync(tableDefinition.TableName);
                const tableResult = await tableCreatorAsync();
                await this.waitForExistAsync(tableDefinition.TableName);
                return Promise.resolve(tableResult);
            }
        );
    }

    async deleteAsync (tableName: string): Promise<any> {
        const tableRemoverAsync = async () => {
            return new Promise((resolve, reject) => {
                const params = { TableName: tableName };
                this.ddb.deleteTable(params, (err: any, data: any) => {
                    if (err) return reject(err);    
                    resolve(data);
                });
            });
        }

        return this.safeRunAsync(
            `There was a **problem** deleting table ${tableName}`,
            async () => {
                await this.waitForExistAsync(tableName);
                const tableResult = await tableRemoverAsync();
                await this.waitForNotExistAsync(tableName);
                return Promise.resolve(tableResult);
            }
        );
    }
}