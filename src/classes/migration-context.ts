import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ItemOperations } from './item-operations';
import { TableOperations } from './table-operations';

// const { Agent } = require("https");
// const { Agent: HttpAgent } = require("http");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const clientConfig = {
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    socketTimeout: 5000,
  }),
};

const client = new DynamoDBClient(clientConfig);
const ddbDocClient = DynamoDBDocumentClient.from(client);

export class MigrationContext {
    private _table: TableOperations;
    private _item: ItemOperations;
    constructor(
        private ddb = client,
        private ddocClient = ddbDocClient
    ) {
        this._table = new TableOperations(this.ddb);
        this._item = new ItemOperations(this.ddocClient);
    }

    get table () {
        return this._table;
    }

    get item () {
        return this._item;
    }

    get DynamoDb() {
        return this.ddb;
    }

    get DocumentClient() {
        return this.ddocClient;
    }
}
