// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html

export type ProjectionType = 'KEYS_ONLY' | 'INCLUDE' | 'ALL';

export type StreamViewType = 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';

export type TableClassType = 'STANDARD' | 'STANDARD_INFREQUENT_ACCESS';

export type DynamoTableDefinition = {
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
 }