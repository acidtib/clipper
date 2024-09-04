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
}

export default new Command()
  .description("Fetch clips from twitch using list of streamers provided.")
  .arguments("<usernames...>")
  .action((options: void, ...args) => {
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

  async execute() {
    const gameId = config.get<string>("twitch_game_id");
    
    const filePath = resolve(this.basePath, "to_download.txt");

    // Read the file content as a string
    const fileContent = await Deno.readTextFile(filePath);
    // Split the content into lines and filter out the lines that don't start with #
    const filteredLines = fileContent.split("\n").filter(line => line.startsWith("#"));
    // Combine the filtered lines back into a single string
    const filteredContent = filteredLines.join("\n");
    
    // Write the filtered content back to the file
    await Deno.writeTextFile(filePath, filteredContent + "\n");

    const hoursAgo = 168; // 7 days
    const startDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();
    
    const users = await this.twitch.client.users.getUsersByNames(this.usernames);

    logger.info(`Fetching Twitch clips for ${users.length} streamers. `);

    let newLines: any[] = [];

    for (const user of users) {
      let streamerClips = [];
      
      const clips = await this.twitch.client.clips.getClipsForBroadcaster(user.id, {
        limit: 20,
        startDate,
        endDate,
      });
      
      for (const clip of clips.data) {
        if (clip.gameId !== gameId?.toString()) continue;
        streamerClips.push(`https://www.twitch.tv/${clip.broadcasterDisplayName}/clip/${clip.id}`);
      }

      newLines.push(...streamerClips.slice(0, Math.random() < 0.3 ? 2 : 1));
    }

    // Append new lines to the file
    const newContent = newLines.join("\n");
    await Deno.writeTextFile(filePath, newContent + "\n", { append: true });

    logger.info(`Added ${newLines.length} clips to ${filePath}`);
    
  }
}