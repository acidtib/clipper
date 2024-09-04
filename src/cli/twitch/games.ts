import { 
  Command,
  colors,
  logger,
  Twitch,
} from "../../deps.ts";

interface Options {
  debug?: boolean
}

export default new Command()
  .description("Gets the game data for the given game name.")
  .arguments("<game_name:string>")
  .action((options: void, ...args) => {
    const action = new Action(options as unknown as Options, ...args);
    return action.execute();
  });


class Action {
  options: Options;
  game_name: string;
  twitch: Twitch

  constructor(options: Options, ...args: Array<string>) {
    if (options.debug) {
      logger.warn(`${colors.bold.green("[DEBUG:]")} / options:`, options);
      logger.warn(`${colors.bold.green("[DEBUG:]")} / args:`, args);
    }

    this.options = options

    this.game_name = args[0]
    
    this.twitch = new Twitch(Twitch.getClientId(), Twitch.getClientSecret());
  }

  async execute() {
    
    const game = await this.twitch.client.games.getGameByName(this.game_name);
    if (!game) {
      logger.error(`Game '${this.game_name}' not found.`);
      Deno.exit(1);
    }

    logger.info(`Game information:`);
    logger.info(`  ID: ${game.id}`);
    logger.info(`  IGDB ID: ${game.igdbId}`);
    logger.info(`  Name: ${game.name}`);
    logger.info(`  Box Art: ${game.getBoxArtUrl(600,800)}`);
    
  }
}