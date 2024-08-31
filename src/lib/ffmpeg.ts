import { 
  colors,
  logger,
  config,
  resolve,
  db
} from "../deps.ts";

import moment from "https://deno.land/x/momentjs@2.29.1-deno/mod.ts";

class FFmpeg {
  debug: boolean;
  device: string;
  quality: string;

  constructor(quality: string = "high", device: string = "cpu", debug = false) {
    this.debug = debug;
    this.quality = quality;
    this.device = device.toLowerCase();
  }

  async normalizeAudio(filePath: string, savePath: string): Promise<number> {
    const command = new Deno.Command("ffmpeg-normalize", {
      args: [
        filePath, 
        "-c:a", "aac",
        "-b:a", "320k",
        "-o", savePath,
        "-f"
      ]
    });

    const { code, stdout, stderr } = await command.output();

    this.debug && logger.warn(colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(filePath)}`), new TextDecoder().decode(stdout));

    // raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stdout));
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`fetch failed with code ${code}`);
    }

    return Number(new TextDecoder().decode(stdout));
  }

  async getAudioDuration(filePath: string): Promise<number> {
    const command = new Deno.Command("ffprobe", {
      args: [
        "-i", 
        filePath, 
        "-show_entries", 
        "format=duration", 
        "-v", 
        "quiet", 
        "-of", 
        "csv=p=0"
      ],
    });

    const { code, stdout, stderr } = await command.output();

    this.debug && logger.warn(colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(filePath)}`), new TextDecoder().decode(stdout));

    // raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stdout));
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`getAudioDuration failed with code ${code}`);
    }

    return Number(new TextDecoder().decode(stdout));
  }

  async getVideoInfo(filePath: string): Promise<Record<string, any>> {
    const command = new Deno.Command("ffprobe", {
      args: [
        "-i",
        filePath,
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
      ],
    });
  
    const { code, stdout, stderr } = await command.output();
  
    if (this.debug) {
      logger.warn(
        colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(filePath)}`),
        new TextDecoder().decode(stdout)
      );
    }
  
    // raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stdout));
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`getVideoInfo failed with code ${code}`);
    }
  
    const info = JSON.parse(new TextDecoder().decode(stdout));
  
    // Extract relevant details
    const format = info.format;
    const streams = info.streams;
    
    const videoStream = streams.find((stream: any) => stream.codec_type === "video");
    const audioStream = streams.find((stream: any) => stream.codec_type === "audio");
  
    return {
      format_long_name: format.format_long_name,
      duration: Number(format.duration),
      size: this.formatBytes(Number(format.size)),
      video: videoStream
        ? {
            codec_name: videoStream.codec_long_name,
            width: videoStream.width,
            height: videoStream.height,
            frame_rate: videoStream.r_frame_rate,
            bit_rate: this.formatBitrateToKbps(Number(videoStream.bit_rate)),
          }
        : null,
      audio: audioStream
        ? {
            codec_name: audioStream.codec_long_name,
            channels: audioStream.channels,
            sample_rate: this.formatHertz(Number(audioStream.sample_rate)),
            bit_rate: this.formatBitrateToKbps(Number(audioStream.bit_rate)),
          }
        : null,
    };
  }

  async trim(filePath: string, savePath: string, startTime: number, endTime: number): Promise<number> {
    const command = new Deno.Command("ffmpeg", {
      args: [
        "-y", 
        "-loglevel", "error", 
        "-i", filePath, 
        "-ss", startTime.toString(), 
        "-to", endTime.toString(), 
        ...(this.device === "cpu" ? ["-c:v", "libx264", "-crf", this.atWhatQuality()] : []),
        ...(this.device === "gpu" ? ["-c:v", "h264_nvenc", "-preset", "slow", "-qp", this.atWhatQuality(), "-profile:v", "high"] : []),
        "-c:a", "aac", 
        savePath
      ],
    });

    const { code, stdout, stderr } = await command.output();

    this.debug && logger.warn(colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(filePath)}`), new TextDecoder().decode(stdout));

    // raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stdout));
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`trim failed with code ${code}`);
    }

    return Number(new TextDecoder().decode(stdout));
  }

  async concat(toConcat: any[], savePath: string): Promise<number> {

    const introEnabled = config.get<boolean>("use_intro");
    const outroEnabled = config.get<boolean>("use_outro");
    const transitionEnabled = config.get<boolean>("use_transition");
    const frameEnabled = config.get<boolean>("use_frame");
    const platformIconEnabled = config.get<boolean>("use_platform_icon");
  
    const introPath = introEnabled ? resolve(config.get<string>("intro_path")!) : null;
    const outroPath = outroEnabled ? resolve(config.get<string>("outro_path")!) : null;
    const transitionPath = transitionEnabled ? resolve(config.get<string>("transition_path")!) : null;
    const framePath = resolve(config.get<string>("frame_path")!);
    const iconTwitchPath = resolve(config.get<string>("platform_icon_path")!);

    // Build the adjusted file list
    let adjustedFileList: string[] = [];

    if (introEnabled) adjustedFileList.push(introPath!);

    toConcat.forEach((clip, i) => {
      // add clip object to list
      adjustedFileList.push(clip);

      if (frameEnabled) {
        // add frame
        adjustedFileList.push(framePath);
      }
      
      if (platformIconEnabled) adjustedFileList.push(iconTwitchPath);

      // add transition if enabled
      if (transitionEnabled && i < toConcat.length - 1) {
        adjustedFileList.push(transitionPath!);
      }
    });

    if (outroEnabled) adjustedFileList.push(outroPath!);
   
    // Generate filter complex for video processing
    let filterIndex = 0;

    let videoFilters = "";
    let audioFilters = "";
    let filterOutputs = "";

    const adjustedForFilters = adjustedFileList.filter(item => item !== framePath).filter(item => item !== iconTwitchPath)
    
    for (const [i, item] of adjustedForFilters.entries()) {
      const isClip = typeof item === "object"
      let streamer
      const isIntro = item === introPath;
      const isOutro = item === outroPath;
      const isTransition = item === transitionPath;

      if (isClip) {
        streamer = await db.streamers.find(item.value.streamerId)
      }

      // add intro if enabled
      if (isIntro) {
        videoFilters += `[${filterIndex}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=2560:1440:force_original_aspect_ratio=decrease,pad=2560:1440:-1:-1,setsar=1,drawtext=fontfile=assets/fonts/CowboyHippiePro.otf:text='hello':x=(w-text_w)/2:y=700:fontsize=220:fontcolor=#78854A[v${i}];`;
      }

      // add outro if enabled
      if (isOutro) {
        videoFilters += `[${filterIndex}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=2560:1440:force_original_aspect_ratio=decrease,pad=2560:1440:-1:-1,setsar=1[v${i}];`;
      }

      // add transition if enabled
      if (isTransition) {
        videoFilters += `[${filterIndex}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=2560:1440:force_original_aspect_ratio=decrease,pad=2560:1440:-1:-1,setsar=1[v${i}];`;
      }

      if (isClip && frameEnabled) {       
        // clip with frame
        videoFilters += `[${filterIndex}:v]scale=1709x961[scaled_video${i+1}];[${filterIndex += 1}:v]scale=2560:1440,drawtext=fontfile=assets/fonts/GT-Sectra-Fine-Medium.ttf:text='${streamer.value.username.toUpperCase()}'`

        audioFilters += `[${filterIndex - 1}:a]asetpts=PTS-STARTPTS[a${i}];`;

        if (platformIconEnabled) {
          videoFilters += `:x=170:y=h-th-45:fontsize=49:fontcolor=#e7e7d7[overlay];[overlay][scaled_video${i+1}]overlay=x=107:y=0[v${i}];`;
          videoFilters += `[v${i}][${filterIndex += 1}:v]overlay=x=108:y=main_h-overlay_h-35[v${i}];`;
        } else {
          videoFilters += `:x=110:y=h-th-45:fontsize=49:fontcolor=#e7e7d7[overlay];[overlay][scaled_video${i+1}]overlay=x=107:y=0[v${i}];`;
        }
        
        filterOutputs += `[v${i}][a${i}]`;
      } else if (isClip) {
        // normal clip
        if (platformIconEnabled) {
          videoFilters += `[${filterIndex}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=2560:1440:force_original_aspect_ratio=decrease,pad=2560:1440:-1:-1,setsar=1,drawtext=fontfile=assets/fonts/GT-Sectra-Fine-Medium.ttf:text='${streamer.value.username}':box=1:boxcolor=black@0.6:boxborderw=5:x=100:y=24:fontsize=50:fontcolor=#e7e7d7[v${i}];[v${i}][${filterIndex += 1}:v]overlay=x=30:y=20[v${i}];`;
          audioFilters += `[${filterIndex - 1}:a]asetpts=PTS-STARTPTS[a${i}];`;
          filterOutputs += `[v${i}][a${i}]`;

        } else {
          videoFilters += `[${filterIndex}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=2560:1440:force_original_aspect_ratio=decrease,pad=2560:1440:-1:-1,setsar=1,drawtext=fontfile=assets/fonts/GT-Sectra-Fine-Medium.ttf:text='${streamer.value.username}':box=1:boxcolor=black@0.6:boxborderw=5:x=30:y=20:fontsize=50:fontcolor=#e7e7d7[v${i}];`;
          audioFilters += `[${filterIndex}:a]asetpts=PTS-STARTPTS[a${i}];`;
          filterOutputs += `[v${i}][a${i}]`;
        }
      }

      // if its a clip or transition, add the video and audio to the filter
      if (isIntro || isOutro || isTransition) {
        audioFilters += `[${filterIndex}:a]asetpts=PTS-STARTPTS[a${i}];`;
        filterOutputs += `[v${i}][a${i}]`;
      }

      filterIndex += 1
    }

    const filterComplex = `${videoFilters}${audioFilters}${filterOutputs}concat=n=${adjustedForFilters.length}:v=1:a=1[outv][outa]`;

    const args = [
      "-y",
      ...adjustedFileList.flatMap(file => typeof file === "string" ? ["-i", file] : ["-i", file.value.file_path]),
      "-filter_complex", `${filterComplex}`,
      "-map", "[outv]",
      "-map", "[outa]",
      "-force_key_frames", "expr:gte(t,n_forced/2)",
      
      // options for cpu
      ...(this.device === "cpu" ? ["-c:v", "libx264", "-crf", this.atWhatQuality()] : []),

      // options for gpu
      ...(this.device === "gpu" ?
        [
          "-c:v", "h264_nvenc",
          "-rc", "constqp",
          "-qmin", "17", "-qmax", "51",
          "-tune", "hq",
          "-preset", "p7",
          "-qp", this.atWhatQuality()
        ] : []),
  
      "-bf", "2",
      "-c:a", "aac",
      "-q:a", "1",
      "-ac", "2",
      "-ar", "48000",
      "-use_editlist", "0",
      "-movflags", "+faststart",
      "-r", "60",
      savePath
    ];

    console.log(args.join(" "));

    // return 0

    this.debug && console.log(args.join(" "));
  
    const command = new Deno.Command("ffmpeg", {
      args: args,
    });
  
    const { code, stdout, stderr } = await command.output();
  
    this.debug && logger.warn(colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(savePath)}`), new TextDecoder().decode(stdout));
  
    // Raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stdout));
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`concat failed with code ${code}`);
    }
  
    return Number(new TextDecoder().decode(stdout));
  }
  
  async formatTime(seconds: number) {
    const duration = moment.duration(seconds, 'seconds');

    const hours = duration.hours().toString().padStart(2, '0');
    const minutes = duration.minutes().toString().padStart(2, '0');
    const secs = duration.seconds().toString().padStart(2, '0');
    const milliseconds = duration.milliseconds().toString().padStart(3, '0');

    const formattedDuration = `${hours}:${minutes}:${secs}.${milliseconds}`;

    return formattedDuration;
  }

  async parseTime(timeString: string) {
    const [hours, minutes, secondsWithMilliseconds] = timeString.split(':');
    const [seconds, milliseconds] = secondsWithMilliseconds.split('.');
  
    const totalSeconds =
      parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10) +
      (parseInt(milliseconds, 10) || 0) / 1000;
  
    return totalSeconds;
  }

  private atWhatQuality() {
    // CRF 5 ≈ QP 10 (Very high quality, large file size)
    // CRF 18 ≈ QP 18 (Good quality, reasonable file size)
    // CRF 30 ≈ QP 28-30 (Lower quality, smaller file size)
    
    let qualityNumber: number;

    switch (this.quality) {
      case "high":
        qualityNumber = this.device === "cpu" ? 5 : 10;
        break;
      case "good":
        qualityNumber = this.device === "cpu" ? 15 : 18;
        break;
      case "low":
        qualityNumber = this.device === "cpu" ? 30 : 28;
        break;
      default:
        throw new Error(`quality must be one of high, good, or low`);
    }

    return qualityNumber.toString();
  }

  private formatBytes(bytes: number): string {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (bytes >= 1024 && i < sizes.length) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(2)} ${sizes[i]}`;
  }

  private formatBitrateToKbps(bitrate: number): string {
    const kbps = Math.round(bitrate / 1000);
    return `${kbps}kbps`;
  }

  private formatHertz(hertz: number): string {
    const sizes = ["Hz", "KHz", "MHz", "GHz"];
    let i = 0;
    while (hertz >= 1000 && i < sizes.length) {
      hertz /= 1000;
      i++;
    }
    return `${hertz.toFixed(2)} ${sizes[i]}`;
  }
  
}

export { FFmpeg }