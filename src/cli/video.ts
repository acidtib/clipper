import { Command, HelpCommand } from "../deps.ts";

const command = new Command()
  .description("Create and render a video.")

  .globalOption("--device <device:string>", "Device to use", { default: "cpu" })
  .globalOption("--quality <quality:string>", "Quality to use", { default: "high" })
  .globalOption("--overwrite", "Overwrite existing files.", { default: false })

  .action(() => {
    command.showHelp();
    Deno.exit(0);
  })

  .command("info", (await import("./video/info.ts")).default)
  .command("download", (await import("./video/download.ts")).default)
  .command("render", (await import("./video/render.ts")).default)
  .command("help", new HelpCommand())

export default command;