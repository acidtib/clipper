import { Command, HelpCommand } from "./deps.ts";

// commands
import initCommand from "./cli/init.ts";
import videoCommand from "./cli/video.ts";
import twitchCommand from "./cli/twitch.ts";

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
      console.log("clipper v0.0.3");
    },
  });

command
  .command("init", initCommand)
  .command("video", videoCommand)
  .command("twitch", twitchCommand)
  .command("help", new HelpCommand())
  .parse(Deno.args);