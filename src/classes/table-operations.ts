import { CreateTableCommand, CreateTableCommandInput, DeleteTableCommand, DescribeTableCommand, DynamoDBClient, waitUntilTableExists, waitUntilTableNotExists } from '@aws-sdk/client-dynamodb';
import { Operation } from "./operation";

export class TableOperations extends Operation {
    constructor(
        private ddb: DynamoDBClient
    ) {
        super();
    }
    private async waitForTableExistenceAsync (tableName: string, exists: boolean): Promise<void> {
      const params = { TableName: tableName };
      const fn = exists ? waitUntilTableExists : waitUntilTableNotExists;
      await fn({ client: this.ddb } as any, params)
    }

    async waitForExistAsync (tableName: string): Promise<void> {
        return this.waitForTableExistenceAsync(tableName, true);
    }

    async waitForNotExistAsync (tableName: string): Promise<void> {
        return this.waitForTableExistenceAsync(tableName, false);
    }

    async existsAsync (tableName: string): Promise<any> {
      const params = { TableName: tableName };
      const command = new DescribeTableCommand(params);
      let data;
      try {
        data = await this.ddb.send(command);
      } catch (err: any) {
        if (err.stack.includes('ResourceNotFoundException')) {
          data = false;
        } else {
          throw err;
        }
      }
      return data;
    }

    async createAsync (tableDefinition: CreateTableCommandInput): Promise<any> {

      
        const tableCreatorAsync = async () => {
          const data = await this.ddb.send(new CreateTableCommand(tableDefinition));
          return data;
        }

        return this.safeRunAsync(
            `There was a **problem** creating table ${tableDefinition.TableName} ...`,
            async () => {
                await this.waitForNotExistAsync(tableDefinition.TableName as string);
                const tableResult = await tableCreatorAsync();
                await this.waitForExistAsync(tableDefinition.TableName as string);
                return Promise.resolve(tableResult);
            }
        );
    }

    async deleteAsync (tableName: string): Promise<any> {
        const tableRemoverAsync = async () => {
          const data = await this.ddb.send(new DeleteTableCommand({ TableName: tableName }));
          return data;
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