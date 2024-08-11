# clipper (Work In Progress)

### Dependencies

- [ffmpeg](https://ffmpeg.org/)

```
# Windows
?

# Ubuntu
sudo apt update && sudo apt upgrade
sudo apt install ffmpeg

# MacOS
brew update
brew install ffmpeg
```

- [ffmpeg-normalize](https://github.com/slhck/ffmpeg-normalize)
```
pip3 install ffmpeg-normalize
```

- [yt-dlp](https://github.com/yt-dlp/yt-dlp)

```
# Windows
python3 -m pip install --no-deps -U yt-dlp

# Ubuntu
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp

chmod a+rx ~/.local/bin/yt-dlp

# MacOS
brew install yt-dlp
```


### Usage

Create config file with `init` command
```bash
clipper init
```

Edit file `to_download.txt` with the links of the clips you want to download

Download videos with `download` command, id is an arbitrary string that represents the video
```bash
clipper download <id>
```