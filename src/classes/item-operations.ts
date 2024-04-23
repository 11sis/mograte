import { DeleteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { BatchWriteItemCommand, BatchWriteItemCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Operation } from "./operation";

export const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: true, // false, by default.
  convertWithoutMapWrapper: true,
};

export class ItemOperations extends Operation {
    constructor(
        private ddocClient: DynamoDBDocumentClient
    ) { super(); }

    async getAllAsync (params: any): Promise<any> {

        const recordGetterAsync = async () => {
          const scanCommand = new ScanCommand(params);
          const result = await this.ddocClient.send(scanCommand) as any;
          return result;
        }

        return this.safeRunAsync(
            `There was an issue getting records for ${JSON.stringify(params)}`,
            () => {
                return recordGetterAsync();
            }
        )

    }

    private _splitIntoDynamoDBWriteBatches(tableName: string, items: any[]): BatchWriteItemCommandInput[] {
      const batches = [] as any;
      let currentBatch = [] as any;
      while (items.length) {
        // ddb batch write limit is 25
        if (currentBatch.length === 25) {
          batches.push(currentBatch);
          currentBatch = [];
        }
        currentBatch.push(items.shift());
      }
      batches.push(currentBatch);
      batches.filter((x) => x.length > 0);
  
      const writeBatches = batches.map((batch) => {
        const putRequests = batch.map((item: any) => {
          const marshalledItem = marshall(item, marshallOptions) as any;
          return {
            PutRequest: { 
              Item: marshalledItem.M || marshalledItem
            }
          }
        });
  
        return {
          RequestItems: {
            [tableName]: putRequests
          }
        };
      });
  
      return writeBatches;
    }

    private async _sendBatchToDynamo(tableName: string, batch: BatchWriteItemCommandInput, config: any): Promise<any> {
      let writeResult;
      try {
        writeResult = await this.ddocClient.send(
          new BatchWriteItemCommand(batch),
          config
        );
      } catch (ex) {
        console.error('ERROR WRITING BATCH', ex);
        process.exit(1);
      }
  
      if (writeResult?.UnprocessedItems && writeResult.UnprocessedItems[tableName]) {
        return await this._sendBatchToDynamo(tableName, { RequestItems: writeResult.UnprocessedItems }, config);
      }
  
      return writeResult;
    }

    async writeAsync (itemOrItems: any|any[], tableName: string): Promise<any|any[]> {
      if (typeof itemOrItems === 'object' && !Array.isArray(itemOrItems)) {
        itemOrItems = [itemOrItems];
      }

      return this.safeRunAsync(
        [ `There was a problem writing item or items`, itemOrItems ],
        async () => {
          const totalItems = itemOrItems.length;

          const writeBatches = this._splitIntoDynamoDBWriteBatches(tableName, itemOrItems);
          await Promise.all(writeBatches.map((b) => this._sendBatchToDynamo(tableName, b, {})));
    
          return totalItems;
        }
      );       
    }

    async deleteAsync (id: string|number, tableName: string) {
        const recordDeleter = async () => {
            var params = {
                TableName: tableName,
                Key: { id },
            }

            const data = await this.ddocClient.send(new DeleteCommand(params));
            return data;
        }

        return this.safeRunAsync(
            `There was a problem deleting item by id ${id}`,
            async () => {
                const deleteResult = await recordDeleter();
                return Promise.resolve(deleteResult);
            }
        )

    }

}