import { 
  Command,
  colors,
  resolve,
  logger,
} from "../deps.ts";

interface Options {
  debug?: boolean
}

export default new Command()
  .description("Return video information.")
  .arguments("<id:string>")
  .action((options: void, ...args) => {
    const action = new Action(options as unknown as Options, ...args);
    return action.execute();
  });


class Action {
  id: string;
  kvKey: string[];
  basePath: string;

  constructor(options: Options, ...args: Array<string>) {
    if (options.debug) {
      logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / options:`, options);
      logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / args:`, args);
    }

    this.id = args[0]
    this.basePath = resolve("./", "results", this.id)
    this.kvKey = ["videos", this.id]
  }

  async execute() {
    logger.info(`${colors.bold.yellow.underline(this.id)} / Files:`, this.basePath);
    
    for await (const dirEntry of Deno.readDir(this.basePath)) {
      if (dirEntry.isDirectory) {
        logger.info(dirEntry.name + "/");
      } else {
        logger.info(dirEntry.name);
      }
    }
  }
}