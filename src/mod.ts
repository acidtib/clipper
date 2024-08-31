import { Command, HelpCommand } from "./deps.ts";

// ensures database is created
import "./lib/db.ts";

const command = new Command()
  .name("clipper")
  .description("CLI for Bloodline Ranks Youtube videos.")
  .action(() => {
    command.showHelp();
    Deno.exit(0);
  })
  .globalOption("-d, --debug", "Run in debug mode")
  .option("-v, --version", "Output the version number", {
    standalone: true,
    action: () => {
      console.log("0.0.1");
    },
  })

command
  .command("init", (await import("./cli/init.ts")).default as unknown as Command)
  .command("video", (await import("./cli/video.ts")).default as unknown as Command)
  .command("twitch", (await import("./cli/twitch.ts")).default as unknown as Command)
  .command("help", new HelpCommand())
  .parse(Deno.args);