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
          "# config.yml",
          "## FRAME",
          "# Determines whether to include a frame around the video.",
          "# Set to true to enable the frame feature, or false to disable it.",
          "frame: false",
          "frame_path: ./assets/media/frame.png",
          "",
          "## PLATFORM ICON",
          "platform_icon: false",
          "platform_icon_path: ./assets/media/icon_twitch.png",
          "",
          "## INTRO",
          "# Indicates whether to include an intro at the beginning of the video. ",
          "# Set to true to include the intro, or false to omit it.",
          "intro: false",
          "# Specifies the file path to the MP4 video used as the intro. ",
          "# This path should point to a valid MP4 file that will be added at the start of the video if intro is set to true.",
          "intro_path: ./assets/media/intro_weekly.mp4",
          "",
          "## FIRST CLIP AS INTRO",
          "# Indicates whether to use the first clip as the intro. ",
          "first_clip_as_intro: false",
          "",
          "## TRANSITION",
          "# Specifies whether to use a transition effect between video clips. ",
          "# Set to true to enable transitions, or false to disable them.",
          "transition: false",
          "# Defines the file path to the MP4 video used for the transition effect. ",
          "# This path should point to a valid MP4 file that will be used if transition is set to true.",
          "transition_path: ./assets/media/transition.mp4",
          "",
          "## OUTRO",
          "# Indicates whether to include an outro at the end of the video.",
          "# Set to true to include the outro, or false to omit it.",
          "outro: false",
          "# Specifies the file path to the MP4 video used as the outro. ",
          "# This path should point to a valid MP4 file that will be appended to the end of the video if use_outtro is set to true.",
          "outro_path: ./assets/media/outro.mp4",
          "",
          "## TWITCH",
          "# Specifies the ID of the game to use.",
          "twitch_game_id: 500188",
          "# Specifies the client ID and client secret for the Twitch API. ",
          "# These values can be obtained by creating a new app in the Twitch Developer Portal. https://dev.twitch.tv/console ",
          "twitch_client_id: ",
          "twitch_client_secret: ",
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
          "# to_download.txt",
          "# This file contains a list of Twitch clips to be downloaded and processed.",
          "# Each entry represents a clip with relevant metadata.",
          "# Format is:",
          "#",
          "# s:00:00:00.000,e:00:00:00.000,https://www.twitch.tv/hornetlul/clip/TriumphantWonderfulWasabiBibleThump--yjmM6yB3gJhTClJ",
          "#",
          "# s = start time",
          "# e = end time",
          "#",
          "# u = username",
          "# p = platform (twitch, youtube)",
          "# v = views (used for sorting)",
          "#",
          "# If start time or end time is provided, the clip will be trimmed to that time range.",
          "# If no start time or end time is provided, the clip will be downloaded and processed as-is.",
          "#",
          "# only Twitch and YouTube clips are supported for now",
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