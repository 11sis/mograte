import { logger } from "../logger";

export class Operation {

    async safeRunAsync(errorMessage: string|string[], pred: () => Promise<any>, skipExit = false): Promise<any> {
        try {
            return pred();
        } catch(ex) {
            if (typeof errorMessage === 'object' && errorMessage.length) {
                errorMessage.forEach((msg) => {
                    logger.error(msg);
                });
            } else {
                logger.error(errorMessage);
            }

            logger.error(ex);
            if (!skipExit) {
                process.exit(1);
            }
        }
    }
}