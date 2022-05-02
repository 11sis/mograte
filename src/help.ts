import { logger } from "./logger"


const help = `
Usage: mograte [options] [command]

Options:

  -h, --help     output usage information

Commands:

  init           Initalize the migrations tool in a project
  list           List migrations and their status
  create <name>  Create a new migration
  up [name]      Migrate up to a given migration
  down [name]    Migrate down to a given migration
`

export const runHelp = () => {
    logger.log(help);
}