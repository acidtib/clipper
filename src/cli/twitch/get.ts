import { 
  Command,
  colors,
  resolve,
  logger,
  Twitch,
} from "../../deps.ts";

interface Options {
  debug?: boolean
}

export default new Command()
  .description("Fetch latest clips from twitch.")
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

    let newLines = [];

    for (const user of users) {
    
      const clips = await this.twitch.client.clips.getClipsForBroadcaster(user.id, {
        limit: Math.random() < 0.3 ? 2 : 1,
        startDate,
        endDate,
      });
      
      for (const clip of clips.data) {
        const url = `https://www.twitch.tv/${clip.broadcasterDisplayName}/clip/${clip.id}`;
        newLines.push(url);
      }
    }

    // Append new lines to the file
    const newContent = newLines.join("\n");
    await Deno.writeTextFile(filePath, newContent + "\n", { append: true });

    logger.info(`Added ${newLines.length} clips to ${filePath}`);
    
  }
}