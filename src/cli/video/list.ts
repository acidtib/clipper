import { 
  Command,
  colors,
  resolve,
  logger,
  db
} from "../../deps.ts";

interface Options {
  debug?: boolean
}

export default new Command()
  .description("Return a list of videos in the database.")
  .action((options: void, ...args) => {
    const action = new Action(options as unknown as Options, ...args);
    return action.execute();
  });


class Action {
  options: Options;

  constructor(options: Options, ...args: Array<string>) {
    if (options.debug) {
      logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / options:`, options);
      logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / args:`, args);
    }

    this.options = options
  }

  async execute() {
    const { result: videos } = await db.videos.getMany()

    logger.info(`Videos:`, videos.length);

    for (const video of videos) {
      logger.info(`Video ID: ${video.id} | Created: ${new Date(video.value.createdAt).toLocaleString()} | ${video.value.output || ""}`);
    }
  }
}