import { Operation } from "./operation";

export class ItemOperations extends Operation {
    constructor(
        private ddocClient: any
    ) { super(); }

    async getAllAsync (params: any): Promise<any> {
        const recordGetterAsync = async () => {
            return new Promise((resolve, reject) => {
                this.ddocClient.scan(params, (err: any, data: any) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
        }

        return this.safeRunAsync(
            `There was an issue getting records for ${JSON.stringify(params)}`,
            () => {
                return recordGetterAsync();
            }
        )

    }

    async writeAsync (itemOrItems: any|any[], tableName: string): Promise<any|any[]> {
        const recordWriterAsync = async (item: any) => {
            var params = {
                TableName: tableName,
                Item: item
            };
            return new Promise((resolve, reject) => {
                this.ddocClient.put(params, (err: any, data: any) => {
                    if (err) return reject(err);                    
                    resolve(data);
                });
            });
        }

        return this.safeRunAsync(
            [ `There was a problem writing item or items`, itemOrItems ],
            async () => {
                let result;
                if (Array.isArray(itemOrItems)) {
                    result = [];
                    for(let i = 0; i < itemOrItems.length; i++) {
                        const writeResult = await recordWriterAsync(itemOrItems[i]);
                        result.push(writeResult);
                    }
                } else {
                    result = await recordWriterAsync(itemOrItems);
                }

                return Promise.resolve(result);
            }
        );        
    }

    async deleteAsync (id: string|number, tableName: string) {
        const recordDeleter = async () => {
            var params = {
                TableName: tableName,
                Key: { id },
            }
            return new Promise((resolve, reject) => {
                this.ddocClient.delete(params, (err: any, data: any) => {
                    if (err) return reject(err);
                    resolve(data);
                })
            });
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