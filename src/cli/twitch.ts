import { Command, HelpCommand } from "../deps.ts";

const command = new Command()
  .description("Working with twitch data.")

  .globalOption("--force", "Force action.", { default: false })

  .action(() => {
    command.showHelp();
    Deno.exit(0);
  })

  .command("clips", (await import("./twitch/clips.ts")).default)
  .command("games", (await import("./twitch/games.ts")).default)
  .command("help", new HelpCommand())

export default command;