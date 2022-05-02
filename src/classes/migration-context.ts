const AWS = require('aws-sdk');
import { ItemOperations } from './item-operations';
import { TableOperations } from './table-operations';


export class MigrationContext {
    private _table: TableOperations;
    private _item: ItemOperations;
    constructor(
        private ddb = new AWS.DynamoDB(),
        private ddocClient = new AWS.DynamoDB.DocumentClient()
    ) {
        this._table = new TableOperations(ddb);
        this._item = new ItemOperations(ddocClient);
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