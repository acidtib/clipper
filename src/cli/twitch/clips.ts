import { 
  Command,
  colors,
  resolve,
  logger,
  Twitch,
  config,
} from "../../deps.ts";

interface Options {
  debug?: boolean
  merge: boolean
  limit: number
}

export default new Command()
  .description("Fetch clips from twitch using list of streamers provided.")
  .arguments("<usernames...>")
  .option("--merge", "Merge links into current list.", { default: false })
  .option("--limit <value:number>", "Limit the number of clips to fetch.", { default: 2 })
  .action((options: Options, ...args) => {
    const action = new Action(options as unknown as Options, ...args);
    return action.execute();
  });


class Action {
  options: Options;
  usernames
  basePath: string;
  twitch: Twitch
  constructor(options: Options, ...args: Array<string>) {
    if (options.debug) {
      logger.warn(`${colors.bold.green("[DEBUG:]")} / options:`, options);
      logger.warn(`${colors.bold.green("[DEBUG:]")} / args:`, args);
    }

    this.options = options

    this.usernames = args
    this.basePath = resolve("./")
    this.twitch = new Twitch(Twitch.getClientId(), Twitch.getClientSecret());
  }

  selectClips(clips: any[]): any[] {
    if (clips.length === 0) return [];
    
    // Return top 2 clips, or all available clips if less than 2
    return clips.slice(0, Math.min(this.options.limit, clips.length));
  }

  async execute() {
    const gameId = config.get<string>("twitch_game_id");
    
    const filePath = resolve(this.basePath, "to_download.txt");  

    const hoursAgo = 192; // 8 days
    const startDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    const users = await this.twitch.client.users.getUsersByNames(this.usernames);

    logger.info(`Fetching Twitch clips for ${users.length} streamers. `);

    let clipsList = [];

    for (const user of users) {
      let streamerClips = [];

      // get the streamer last 20 clips
      const clips = await this.twitch.client.clips.getClipsForBroadcaster(user.id, {
        limit: 20,
        startDate,
        endDate,
      });

      for (const clip of clips.data) {
        // filter out clips that are not from the correct game
        if (clip.gameId !== gameId?.toString()) continue;
        streamerClips.push(clip);
      }

      // Sort clips by views in descending order (highest views first)
      streamerClips.sort((a, b) => b.views - a.views);
      
      // Select top viewed clips, based on the limit
      const selectedClips = this.selectClips(streamerClips);
      clipsList.push(...selectedClips);
    }

    if (clipsList.length === 0) {
      logger.info("No clips found. Exiting.");
      Deno.exit();
    }
    
    const newLines = clipsList.map(clip => `v:${clip.views},https://www.twitch.tv/${clip.broadcasterDisplayName}/clip/${clip.id}\n`);

    // Read the file content as a string
    const fileContent = await Deno.readTextFile(filePath);

    // dont overwrite the file if we are merging
    if (!this.options.merge) {
      // Split the content into lines and filter out the lines that don't start with #
      const filteredLines = fileContent.split("\n").filter(line => line.startsWith("#"));
      // Combine the filtered lines back into a single string
      const filteredContent = filteredLines.join("\n");
      // Write the filtered content back to the file
      await Deno.writeTextFile(filePath, filteredContent + "\n\n");
    } else {
      if (!fileContent.endsWith("\n")) {
        newLines.unshift("\n")
      }
    }

    // Append new lines to the file
    await Deno.writeTextFile(filePath, newLines.join(""), { append: true });

    logger.info(`Added ${newLines.length} clips to ${filePath}`);
    
  }
}