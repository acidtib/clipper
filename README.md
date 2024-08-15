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
