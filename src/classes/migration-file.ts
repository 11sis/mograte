export class MigrationFile {
    constructor(
        public date: number,
        public name: string,
        public funcs: any[],
        public file: string,
        public path: string,
    ) { }
}