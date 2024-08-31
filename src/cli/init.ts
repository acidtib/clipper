import { 
  Command,
  colors,
  resolve,
  ensureDir,
  logger,
  parseYaml,
} from "../deps.ts";

interface Options {
  debug?: boolean
}

export default new Command()
  .description("Create local directory structure and config files.")
  .action((options: void, ...args) => {
    const action = new Action(options as unknown as Options, ...args);
    return action.execute();
  });


class Action {
  options: Options;

  constructor(options: Options, ...args: Array<string>) {
    if (options.debug) {
      logger.warn(`${colors.bold.green("[DEBUG:]")} options:`, options);
      logger.warn(`${colors.bold.green("[DEBUG:]")} args:`, args);
    }

    this.options = options
  }

  async execute() {
    logger.info("Initializing...");

    await ensureDir(resolve("./", "assets"));
    await ensureDir(resolve("./", "assets", "database"));
    await ensureDir(resolve("./", "assets", "log"));
    await ensureDir(resolve("./", "assets", "media"));
    
    await ensureDir(resolve("./", "results"));

    const pathFileConfig = resolve("./", "config.yml")
    const pathFileToDownload = resolve("./", "to_download.txt")

    try {
      await Deno.stat(pathFileConfig);
      logger.info("config.yml already exists.");
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        logger.info(`config.yml does not exist. Creating file...`);
        const content = [
          "# config.yml\n",
          "# Determines whether to include a frame around the video.",
          "# Set to true to enable the frame feature, or false to disable it.",
          "use_frame: false",
          "frame_path: ./assets/media/frame.png",
          "",
          "use_platform_icon: false",
          "platform_icon_path: ./assets/media/icon_twitch.png",
          "",
          "# Indicates whether to include an intro at the beginning of the video. ",
          "# Set to true to include the intro, or false to omit it.",
          "use_intro: false",
          "",
          "# Specifies the file path to the MP4 video used as the intro. ",
          "# This path should point to a valid MP4 file that will be added at the start of the video if use_intro is set to true.",
          "intro_path: ./assets/media/intro_weekly.mp4",
          "",
          "# Indicates whether to use the first clip as the intro. ",
          "use_first_clip_as_intro: false",
          "",
          "# Specifies whether to use a transition effect between video clips. ",
          "# Set to true to enable transitions, or false to disable them.",
          "use_transition: false",
          "",
          "# Defines the file path to the MP4 video used for the transition effect. ",
          "# This path should point to a valid MP4 file that will be used if use_transition is set to true.",
          "transition_path: ./assets/media/transition.mp4",
          "",
          "# Indicates whether to include an outro at the end of the video.",
          "# Set to true to include the outro, or false to omit it.",
          "use_outro: false",
          "",
          "# Specifies the file path to the MP4 video used as the outro. ",
          "# This path should point to a valid MP4 file that will be appended to the end of the video if use_outtro is set to true.",
          "outro_path: ./assets/media/outro.mp4",
        ]

        await Deno.writeTextFile(pathFileConfig, content.join("\n"));
      } else {
        logger.error(`Error checking for: ${pathFileConfig}`, error);
      }
    }

    if (this.options.debug) {
      const configContent = await Deno.readTextFile(pathFileConfig);
      logger.warn(colors.bold.green(`[DEBUG:]`), parseYaml(configContent));
    }

    try {
      await Deno.stat(pathFileToDownload);
      logger.info(`to_download.txt already exists.`);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        logger.info(`to_download.txt does not exist. Creating file...`);
        const content = [
          "# to_download.txt\n",
          "# This file contains a list of Twitch clips to be downloaded and processed.",
          "# Each entry represents a clip with relevant metadata.",
          "# Format is:",
          "#",
          "# s:00:00:00.000,e:00:00:00.000,https://www.twitch.tv/hornetlul/clip/TriumphantWonderfulWasabiBibleThump--yjmM6yB3gJhTClJ",
          "#",
          "# s = start time",
          "# e = end time",
          "# If start time or end time is provided, the clip will be trimmed to that time range.",
          "# If no start time or end time is provided, the clip will be downloaded and processed as-is.",
          "#",
          "# only Twitch clips are supported for now",
          "#",
          "###############\n\n",
        ]

        await Deno.writeTextFile(pathFileToDownload, content.join("\n"));
      } else {
        logger.error(`Error checking for: ${pathFileToDownload}`, error);
      }
    }
    
  }
}