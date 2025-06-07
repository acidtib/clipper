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
}

export default new Command()
  .description("Fetch clips from twitch using list of streamers provided.")
  .arguments("<usernames...>")
  .option("--merge", "Merge links into current list.", { default: false })
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

  // Select highest view clip, with 20% chance for second clip if available
  selectClipsWithWeightedRandom(clips: any[]): any[] {
    if (clips.length === 0) return [];
    
    const selectedClips = [];
    
    // Always select the highest view clip (first in sorted array)
    selectedClips.push(clips[0]);
    
    // If there are more clips available, 36% chance to select a random extra clip
    if (clips.length > 1 && Math.random() < 0.36) {
      const remainingClips = clips.slice(1); // All clips except the first (highest)
      const randomIndex = Math.floor(Math.random() * remainingClips.length);
      selectedClips.push(remainingClips[randomIndex]);
    }
    
    return selectedClips;
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
      
      // Weighted random selection based on view counts
      const selectedClips = this.selectClipsWithWeightedRandom(streamerClips);
      clipsList.push(...selectedClips);
    }

    if (clipsList.length === 0) {
      logger.info("No clips found. Exiting.");
      Deno.exit();
    }

    // sort final list by views, keep top first and randomize the rest
    clipsList.sort((a, b) => b.views - a.views);
    
    if (clipsList.length > 1) {
      const topClip = clipsList[0]; // Keep the highest viewed clip
      const restClips = clipsList.slice(1); // Get remaining clips
      
      // Randomize the remaining clips (Fisher-Yates shuffle)
      for (let i = restClips.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [restClips[i], restClips[j]] = [restClips[j], restClips[i]];
      }
      
      clipsList = [topClip, ...restClips]; // Reconstruct with top first, rest randomized
    }

    const newLines = clipsList.map(clip => `https://www.twitch.tv/${clip.broadcasterDisplayName}/clip/${clip.id}\n`);

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