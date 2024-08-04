import { 
  Command,
  colors,
  resolve,
  ensureDir,
  logger,
  YtDlp
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
  downloadsFilePath: string;

  constructor(options: Options, ...args: Array<string>) {
    if (options.debug) {
      logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / options:`, options);
      logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / args:`, args);
    }

    this.options = options

    this.id = args[0]

    this.downloadsFilePath = resolve("./", "assets", "downloads.txt")
    this.basePath = resolve("./", "results", this.id, "clips")
    this.options.debug && logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / basePath:`, this.basePath);

    this.kvKey = ["videos", this.id]
  }

  async execute() {
    let content
    try {
      content = await Deno.readTextFile(this.downloadsFilePath);
      
    } catch (error) {
      logger.error(`${colors.bold.yellow.underline(this.downloadsFilePath)} / Error reading the file.`);
      logger.error(error);
      throw new Error("Error reading the file.");
    }

    await ensureDir(this.basePath);

    content.split("\n").forEach(line => {
      this.download(line)
    })
  }

  private download(clipUrl: string) {
    logger.info(`${colors.bold.yellow.underline(this.id)} / Downloading ${clipUrl}.`);

    let username
    let clipId

    const url = new URL(clipUrl);
    if (url.host.includes("twitch.tv")) {
      // Split the pathname to extract username and clip ID
      const segments = url.pathname.split('/');

      username = segments[1];
      clipId = segments[3];

      console.log(username, clipId);
      
    }

    new YtDlp(clipUrl, resolve(this.basePath, `${username}_${clipId}.%(ext)s`), this.options.debug).fetch()

  }
}