import {
  parseYaml,
  resolve,
  logger
} from "../deps.ts";

class Config {
  private data: Record<string, any>;

  constructor() {
    this.data = this.loadSync();
  }

  private loadSync(): Record<string, any> {
    const configPath = resolve("./", "config.yml");
    try {
      const configContent = Deno.readTextFileSync(configPath);
      return parseYaml(configContent) as Record<string, any>;
    } catch (error) {
      logger.error(`Failed to load configuration from ${configPath}:`, error);
      throw new Error("Failed to load configuration");
    }
  }

  // const useTransition = config.get<boolean>("use_transition"); // true or false
  // const introPath = config.get<string>("intro_path"); // "./assets/media/intro.mp4"
  get<T = any>(key: string): T | undefined {
    const keys = key.split(".");
    let result: any = this.data;

    for (const k of keys) {
      if (result && typeof result === "object" && k in result) {
        result = result[k];
      } else {
        return undefined; // Return undefined if the key does not exist
      }
    }

    return result as T;
  }
}

const config = new Config();

export { config };
