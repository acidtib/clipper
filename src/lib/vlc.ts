import { 
  colors,
  logger
} from "../deps.ts";

class VLC {
  debug: boolean;

  constructor(debug = false) {
    this.debug = debug;
  }

  async openPlayList(folderPath: string): Promise<number> {
    const args = [
      folderPath,
      "--playlist-enqueue", 
      "--playlist-autostart", 
      "--playlist-tree"
    ]

    const command = new Deno.Command("vlc", {
      args: args
    });

    const { code, stdout, stderr } = await command.output();


    this.debug && logger.warn(colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(folderPath)}`), new TextDecoder().decode(stdout));

    // raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`openPlayList failed with code ${code}`);
    }

    return Number(new TextDecoder().decode(stdout));
  }
}

export { VLC }