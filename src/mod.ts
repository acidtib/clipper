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
  .globalOption("--crf <crf:number>", "Set ffmpeg quality.", { default: 5 })
  .option("-v, --version", "Output the version number", {
    standalone: true,
    action: () => {
      console.log("0.0.1");
    },
  })

command
  .command("video", (await import("./cli/video.ts")).default as unknown as Command)
  .command("download", (await import("./cli/download.ts")).default as unknown as Command)
  .command("help", new HelpCommand())
  .parse(Deno.args);