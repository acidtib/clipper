# clipper (Work In Progress)

### Install Dependencies

- [ffmpeg](https://ffmpeg.org/)
- [ffmpeg-normalize](https://github.com/slhck/ffmpeg-normalize)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)


#### Windows
for windows you will need to first install [Chocolatey](https://chocolatey.org/install)
```
-- in powershell as administrator
# ffmpeg
choco install ffmpeg-full

# Python for ffmpeg-normalize and yt-dlp
choco install python

-- normal powershell
# ffmpeg-normalize
python -m pip install -U ffmpeg-normalize

# yt-dlp
python -m pip install -U yt-dlp
```

#### Ubuntu
```
# ffmpeg
sudo apt update && sudo apt upgrade
sudo apt install ffmpeg

# ffmpeg-normalize
python -m pip install --no-deps -U ffmpeg-normalize

# yt-dlp
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp
chmod a+rx ~/.local/bin/yt-dlp
```

#### MacOS
```
# ffmpeg
brew update
brew install ffmpeg

# ffmpeg-normalize
python -m pip install -U ffmpeg-normalize

# yt-dlp
brew install yt-dlp
```

### Usage

Create environment and config file with `init` command
```bash
clipper init
```

Global configuration can be changed on file `config.yml`

Edit file `to_download.txt` with the links of the clips you want to download

Download videos with `download` command, id is an arbitrary string that represents the video
```bash
clipper download <id>
```


```

CRF 5 ≈ QP 10 (Very high quality, large file size)
CRF 18 ≈ QP 18 (Good quality, reasonable file size)
CRF 30 ≈ QP 28-30 (Lower quality, smaller file size)


CPU
ffmpeg -i C:\\Users\\acidtib\\code\\clipper\\results\\1\\clips\\2_whothyfawk_busywildplumberyoudontsay-9nojqsw098-i1p_y.mp4 -i C:\\Users\\acidtib\\code\\clipper\\results\\1\\clips\\1_whityyy_modernsucculentmonkeysquadgoals-cgunmp0lhnex_yzh.mp4 -filter_complex "[0:v]setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v0]; [0:a]asetpts=PTS-STARTPTS[a0]; [1:v]setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v1]; [1:a]asetpts=PTS-STARTPTS[a1]; [v0][a0][v1][a1]concat=n=2:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]" -force_key_frames 'expr:gte(t,n_forced/2)' -c:v libx264 -crf 18 -bf 2 -c:a aac -q:a 1 -ac 2 -ar 48000 -use_editlist 0 -movflags +faststart -r 60 output.mp4

GPU - h264_nvenc 
ffmpeg -i C:\\Users\\acidtib\\code\\clipper\\results\\1\\clips\\2_whothyfawk_busywildplumberyoudontsay-9nojqsw098-i1p_y.mp4 -i C:\\Users\\acidtib\\code\\clipper\\results\\1\\clips\\1_whityyy_modernsucculentmonkeysquadgoals-cgunmp0lhnex_yzh.mp4 -filter_complex "[0:v]setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v0]; [0:a]asetpts=PTS-STARTPTS[a0]; [1:v]setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v1]; [1:a]asetpts=PTS-STARTPTS[a1]; [v0][a0][v1][a1]concat=n=2:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]" -force_key_frames 'expr:gte(t,n_forced/2)' -c:v h264_nvenc -preset slow -qp 15 -profile:v high -bf 2 -c:a aac -q:a 1 -ac 2 -ar 48000 -use_editlist 0 -movflags +faststart -r 60 output_gpu_h264_nvenc.mp4


```