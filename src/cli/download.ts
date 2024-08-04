import { 
  Command,
  colors,
  resolve,
  logger,
} from "../deps.ts";

interface Options {
  debug?: boolean,
  overwrite: boolean,
}

const command = new Command()
  .description("Return video information.")
  .arguments("<id:string>")

  .option("--overwrite", "Overwrite existing files.", { default: false })

  .action((options: Options, ...args) => {
    const action = new Action(options, ...args);
    return action.execute();
  })

export default command

class Action {
  options: Options;
  id: string;
  kvKey: string[];
  basePath: string;

  constructor(options: Options, ...args: Array<string>) {
    if (options.debug) {
      logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / options:`, options);
      logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / args:`, args);
    }

    this.options = options

    this.id = args[0]
    this.basePath = resolve("./", "results", this.id)
    this.options.debug && logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / basePath:`, this.basePath);

    this.kvKey = ["videos", this.id]
  }

  async execute() {

  }
}