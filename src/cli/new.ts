import { 
  Command,
  colors,
  resolve,
  ensureDir,
  logger,
  kv
} from "../deps.ts";

interface Options {
  debug?: boolean,
  crf: number,
  overwrite: boolean,
}

export default new Command()
  .description("Create a new video")
  .arguments("<id:string>")

  .option("--crf <crf:number>", "Set ffmpeg quality.", { default: 5 })
  .option("--overwrite", "Overwrite existing files.", { default: false })

  .action((options: Options, ...args) => {
    const action = new Action(options, ...args);
    return action.execute();
  })

  .command("info", (await import("./info.ts")).default)

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
      this.kvKey = ["videos", this.id]

      this.basePath = resolve("./", "results", this.id)
      this.options.debug && logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / basePath:`, this.basePath);
    }
  
    async execute() {
      const checkVideo = await kv.atomic()
        .check({ key: this.kvKey, versionstamp: null }) // `null` versionstamps mean 'no value'
        .set(this.kvKey, { id: this.id })
        .commit();

      this.options.debug && logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / checkVideo:`, checkVideo);

      if (checkVideo.ok) {
        logger.info(`${colors.bold.yellow.underline(this.id)} / New video.`);
      } else {
        // video exists
        if (this.options.overwrite) {
          logger.info(`${colors.bold.yellow.underline(this.id)} / Overwriting files.`);
        } else {
          logger.info(`${colors.bold.yellow.underline(this.id)} / Video already exists. Use --overwrite to overwrite it.`);
          return
        }
      }

      // create folder
      await ensureDir(this.basePath);

    }
  }