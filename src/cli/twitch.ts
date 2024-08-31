import { Command, HelpCommand } from "../deps.ts";

const command = new Command()
  .description("Fetch twitch data.")

  .globalOption("--force", "Force action.", { default: false })

  .action(() => {
    command.showHelp();
    Deno.exit(0);
  })

  // .command("info", (await import("./video/info.ts")).default)
  // .command("download", (await import("./video/download.ts")).default)
  // .command("render", (await import("./video/render.ts")).default)
  .command("help", new HelpCommand())

export default command;