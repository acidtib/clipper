import {
  Command,
  colors,
  resolve,
  ensureDir,
  exists,
  logger,
  YtDlp,
  FFmpeg,
  db,
} from "../../deps.ts";

import ProgressBar from "https://deno.land/x/progress@v1.4.9/mod.ts";

interface Options {
  debug?: boolean;
  force: boolean;
  device: string;
  quality: string;
}

const command = new Command()
  .description("Download clips from to_download.txt")
  .arguments("<id:string>")
  .action((options: void, ...args) => {
    const action = new Action(options as unknown as Options, ...args);
    return action.execute();
  });

export default command;

class Action {
  options: Options;
  id: string;
  basePath: string;
  downloadsFilePath: string;
  ffmpeg: FFmpeg;
  clipList: { url: string; start: string; end: string }[];

  constructor(options: Options, ...args: Array<string>) {
    if (options.debug) {
      logger.warn(
        `${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / options:`,
        options,
      );
      logger.warn(
        `${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / args:`,
        args,
      );
    }

    this.options = options;

    this.id = args[0];

    this.downloadsFilePath = resolve("./", "to_download.txt");
    this.basePath = resolve("./", "results", this.id, "clips");
    this.options.debug &&
      logger.warn(
        `${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / basePath:`,
        this.basePath,
      );

    this.ffmpeg = new FFmpeg(this.options.quality, this.options.device, this.options.debug);

    this.clipList = [];
  }

  async execute() {
    // check that video id exists
    const video = await db.videos.find(this.id)

    this.options.debug &&
      logger.warn(
        `${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / video:`,
        video,
      );
    
    if (video) {
      // video exists
      if (this.options.force) {
        logger.info(
          `${colors.bold.yellow.underline(this.id)} / Overwriting files.`,
        );

        // update step value
        await db.videos.update(
          this.id,
          { step: "download" },
          { strategy: "merge" },
        )

        // clean up any previous clips from video
        Deno.removeSync(this.basePath, { recursive: true });
      } else {
        logger.info(
          `${colors.bold.yellow.underline(this.id)} / Video id already exists. Use --force to overwrite it.`,
        );
        return;
      }

    } else {
      logger.info(`${colors.bold.yellow.underline(this.id)} / New video id.`);

      // create new video
      const newVideoResult = await db.videos.add({
        video_id: this.id,
        createdAt: new Date(),
        step: "download",
      })

      if (!newVideoResult.ok) {
        logger.error(
          `${colors.bold.yellow.underline(this.id)} / Failed to create new video.`,
        );
        return;
      }
    }


    // clean up any previous clips from video
    await db.clips.deleteMany({
      filter: (doc) => doc.value.videoId === this.id,
    })

    let content;
    try {
      // read links from to_download.txt
      content = await Deno.readTextFile(this.downloadsFilePath);
    } catch (error) {
      logger.error(
        `${colors.bold.yellow.underline(this.downloadsFilePath)} / Error reading the file.`,
      );
      logger.error(error);
      throw new Error("Error reading the file.");
    }

    await ensureDir(this.basePath);

    // clean up file content
    const lines = content
      .split("\n")
      .map((line) => line.trim()) // Trim each line to remove leading/trailing whitespace
      .filter((line) => line && !line.startsWith("#")); // Filter out empty lines and comments

    if (lines.length === 0) {
      logger.info(`${colors.bold.yellow.underline(this.id)} / No clips to download.`);
      return;
    }

    // add streamers to db
    // download each clip and normalize the audio
    const total = lines.length;
    let completed = 0;
    const progress = new ProgressBar({
      total,
      display: "Downloading Clips: :percent [:bar] :time :completed/:total",
    });

    await progress.render(0)

    for (const [index, line] of lines.entries()) {
      let clipData = this.parseLine(line);
      let trimClip = false;

      this.options.debug && logger.warn(colors.bold.green(`[DEBUG:]`), clipData);

      // this.clipList.push(clipData);

      const { source_id, username, source } = this.parseClipUrl(clipData);

      // check if streamer exists
      let streamer = await db.streamers.getOne({
        filter: (doc) => doc.value.username === username && doc.value.platform === source,
      })
      if (!streamer) {
        // add streamer
        streamer = await db.streamers.add({
          username,
          platform: source,
          platform_id: source_id,
        })
      }

      const rawPath = resolve(
        this.basePath,
        `raw_${index}_${username}_${source_id}.mp4`,
      );
      let sourcePath = rawPath;

      // download the clip using yt-dlp
      await new YtDlp(
        clipData.url,
        rawPath.replace(".mp4", ".%(ext)s"),
        this.options.debug,
      ).fetch();

      // get the duration of the clip
      let clipDuration = Math.floor((await this.ffmpeg.getAudioDuration(rawPath)) * 1000) / 1000;

      // trim clip
      const startTime = await this.ffmpeg.parseTime(clipData.start);
      let endTime = await this.ffmpeg.parseTime(clipData.end);
      if (endTime === 0) {
        clipData.end = await this.ffmpeg.formatTime(clipDuration);
        endTime = await this.ffmpeg.parseTime(clipData.end);
      }

      this.options.debug && logger.warn(colors.bold.green(`[DEBUG:]`), clipData);

      if (startTime !== 0 || endTime !== clipDuration) trimClip = true;

      if (this.options.debug) {
        console.log("startTime", startTime);
        console.log("endTime", endTime);
        console.log("clipDuration", clipDuration);
        console.log("trimClip", trimClip);
      }

      // trim the clip
      if (trimClip) {
        await progress.console(`Trimming clip ${source_id} from ${startTime} to ${endTime}`);

        await this.ffmpeg.trim(
          rawPath,
          resolve(this.basePath, `trim_${index}_${username}_${source_id}.mp4`),
          startTime,
          endTime,
        );

        sourcePath = resolve(
          this.basePath,
          `trim_${index}_${username}_${source_id}.mp4`,
        );

        clipDuration = Math.floor((await this.ffmpeg.getAudioDuration(sourcePath)) * 1000) / 1000;
      }

      // normalize the audio
      await this.ffmpeg.normalizeAudio(
        sourcePath,
        resolve(this.basePath, `${index}_${username}_${source_id}.mp4`),
      );

      // add the clip to the db
      await db.clips.add({
        videoId: this.id,
        streamerId: streamer!.id,
        order: index,
        platform: source!,
        platform_id: source_id!,
        platform_url: clipData.url,
        duration: clipDuration,
        file_path: resolve(this.basePath, `${index}_${username}_${source_id}.mp4`),
        trim_start: startTime,
        trim_end: endTime,
        trim_action: trimClip,
        createdAt: new Date(),
      })

      // remove the temp files
      for (const file of [rawPath, sourcePath]) {
        if (await exists(file)) {
          Deno.removeSync(file);
        }
      }

      await progress.console(`Downloaded / ${username} ${source_id}`);
      await progress.render(completed++);

    }

    await progress.render(lines.length);

    logger.info(
      `${colors.bold.yellow.underline(this.id)} / Done downloading ${lines.length} clips`,
    );

  }

  // parse username and clip ID from the URL
  private parseClipUrl(clipData: any = {}) {
    const url = new URL(clipData.url);
    let username = clipData.username || "";
    let source_id;
    let source = clipData.source || "";

    // Split the pathname to extract username and clip ID
    if (url.host.includes("twitch.tv")) {
      const segments = url.pathname.split("/");
      username = segments[1].toLowerCase();
      source_id = segments[3];
      if (!clipData.source) {
        source = "twitch";
      }
    } else if (url.host.includes("youtube.com")) {
      if (!username) {
        throw new Error("Youtube clips require a username to be set using u:username");
      }
      const searchParams = new URLSearchParams(url.search);
      source_id = searchParams.get("v");
      if (!clipData.source) {
        source = "youtube";
      }
    } else {
      throw new Error(`Unsupported source: ${url.host}`);
    }

    return { username, source_id, source };
  }

  // parse the line data
  private parseLine(line: string) {
    const parts = line.split(",");
    let start = "00:00:00.000";
    let end = "00:00:00.000";
    let url = "";
    let username = "";
    let source = "";

    parts.forEach((part) => {
      // start time
      if (part.startsWith("s:")) {
        start = part.substring(2);

      // end time
      } else if (part.startsWith("e:")) {
        end = part.substring(2);

      // url
      } else if (part.startsWith("https://") || part.startsWith("http://")) {
        url = part;

      // username
      } else if (part.startsWith("u:")) {
        username = part.substring(2);

      // source
      } else if (part.startsWith("p:")) {
        source = part.substring(2);
      }
    });

    return { start, end, url, username, source };
  }
}
