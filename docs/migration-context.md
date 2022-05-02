# Migration Context

## Available Operations

- ### <ins>**`table`**</ins>

    - `waitForExistAsync`
        - #### <span style="color: dodgerblue">description:</span>
          - Awaitable function waits for a table `tableName` to exist before returning
            - useful when waiting for a table to be created
        - #### <span style="color: dodgerblue">parameters:</span>
          - `tableName`: string
        - #### <span style="color: dodgerblue">returns:</span> Promise&lt;`void`&gt;
    - `waitForNotExistAsync`
        - #### <span style="color: dodgerblue">description:</span>
          - Awaitable function waits for a table `tableName` to **NOT** exist before returning
            - useful when waiting for a table to delete
        - #### <span style="color: dodgerblue">parameters:</span>
          - `tableName`: string
        - #### <span style="color: dodgerblue">returns:</span> Promise&lt;`void`&gt;
    - `existsAsync`
        - #### <span style="color: dodgerblue">description:</span>
          - Awaitable function determines if a table exists
            - useful when waiting for a table to delete
        - #### <span style="color: dodgerblue">parameters:</span>
          - `tableName`: string
        - #### <span style="color: dodgerblue">returns:</span> Promise&lt;`DynamoTableDefinition` | `void`&gt;
    - `createAsync`
        - #### <span style="color: dodgerblue">description:</span>
          - Awaitable function creates a DynamoDB table
            - call is wrapped with calls to `waitForNotExistAsync` and `waitForExistAsync` to ensure fidelity
        - #### <span style="color: dodgerblue">parameters:</span>
          - `tableDefinition`: DynamoTableDefinition
        - #### <span style="color: dodgerblue">returns:</span> Promise&lt;`DynamoTableDefinition` | `void`&gt;
    - `deleteAsync`
        - #### <span style="color: dodgerblue">description:</span>
          - Awaitable function deletes a DynamoDB table
            - call is wrapped with calls to `waitForExistAsync` and `waitForNotExistAsync` to ensure fidelity
        - #### <span style="color: dodgerblue">parameters:</span>
          - `tableName`: string
        - #### <span style="color: dodgerblue">returns:</span> Promise&lt;`any`&gt;
    
- ### <ins>**`item`**</ins>

    - `getAllAsync`
        - #### <span style="color: dodgerblue">description:</span>
          - Awaitable function scans a DynamoDB table and returns a page of data/items according to `params` passed
        - #### <span style="color: dodgerblue">parameters:</span>
          - `params`: any
        - #### <span style="color: dodgerblue">returns:</span> Promise&lt;`any`&gt;
    - `writeAsync`
        - #### <span style="color: dodgerblue">description:</span>
          - Awaitable function will write the `item` to the `tableName` table
        - #### <span style="color: dodgerblue">parameters:</span>
          - `item`: any
          - `tableName`: string
        - #### <span style="color: dodgerblue">returns:</span> Promise&lt;`any`&gt;
    - `deleteAsync`
        - #### <span style="color: dodgerblue">description:</span>
          - Awaitable function will delete the item with the matching `id` from the `tableName` table
        - #### <span style="color: dodgerblue">parameters:</span>
          - `id`: string | number
          - `tableName`: string
        - #### <span style="color: dodgerblue">returns:</span> Promise&lt;`any`&gt;

## Other Types

- <ins>**`DynamoTableDefinition`**</ins> (pulled from [here](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html))
    ```typescript
        TableName: string,
        AttributeDefinitions: { 
            AttributeName: string,
            AttributeType: 'S' | 'N' | 'B'
        }[],
        BillingMode: 'PROVISIONED' | 'PAY_PER_REQUEST',
        GlobalSecondaryIndexes?: { 
            IndexName: string,
            KeySchema: { 
                AttributeName: string,
                KeyType: 'HASH' | 'RANGE'
            }[]
            Projection: { 
                NonKeyAttributes: [ string ],
                ProjectionType: ProjectionType
            },
            ProvisionedThroughput: { 
                ReadCapacityUnits: number,
                WriteCapacityUnits: number
            }
        }[],
        KeySchema: { 
            AttributeName: string,
            KeyType: string
        }[],
        LocalSecondaryIndexes?: { 
            IndexName: string,
            KeySchema: [ 
                { 
                    AttributeName: string,
                    KeyType: string
                }
            ],
            Projection: { 
                NonKeyAttributes: [ string ],
                ProjectionType: ProjectionType
            }
        }[],
        ProvisionedThroughput?: { 
            ReadCapacityUnits: number,
            WriteCapacityUnits: number
        },
        SSESpecification?: { 
            Enabled: boolean,
            KMSMasterKeyId: string,
            SSEType: string
        },
        StreamSpecification?: { 
            StreamEnabled: boolean,
            StreamViewType?: StreamViewType
        },
        TableClass?: TableClassType,
        Tags?: { 
            Key: string,
            Value: string
        }[]
    ```

- <ins>**`TableClassType`**</ins>

    - `'STANDARD' | 'STANDARD_INFREQUENT_ACCESS';`

- <ins>**`StreamViewType`**</ins>

    - `'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';`

- <ins>**`ProjectionType`**</ins>

    - `'KEYS_ONLY' | 'INCLUDE' | 'ALL';`

> dump... TODO: fix/format later
```typescript
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
}
```