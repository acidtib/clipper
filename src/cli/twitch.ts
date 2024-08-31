import { Command, HelpCommand } from "../deps.ts";

const command = new Command()
  .description("Working with twitch data.")

  .globalOption("--force", "Force action.", { default: false })

  .action(() => {
    command.showHelp();
    Deno.exit(0);
  })

  .command("get", (await import("./twitch/get.ts")).default)
  .command("help", new HelpCommand())

export default command;