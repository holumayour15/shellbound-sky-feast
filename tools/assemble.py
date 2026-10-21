# Joins the captured frames and music into the trailer: a 16:9 MP4 and a 9:16 version for phone stories.
# Standard settings for phones and messaging apps: H.264 High, yuv420p (TV range), AAC 48 kHz, fast start.
import os, subprocess, sys
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
D = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else D
frames = os.path.join(D, 'out', 'frames', 'f%04d.jpg'); audio = os.path.join(D, 'out', 'audio.webm')
wide = os.path.join(OUT, 'Shellbound_Trailer_20s.mp4'); tall = os.path.join(OUT, 'Shellbound_Trailer_20s_vertical.mp4')

def run(args): subprocess.run([FF, '-y', '-loglevel', 'error', *args], check=True); print('made', args[-1])

afx = '[1:a]atrim=0:20,asetpts=PTS-STARTPTS,afade=t=in:d=0.3,afade=t=out:st=18.6:d=1.4,loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000[a]'
video_in = ['-framerate', '30', '-i', frames, '-i', audio]
enc = ['-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
       '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-t', '20', '-r', '30', '-movflags', '+faststart']
tv = 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p'
run([*video_in, '-filter_complex', f'[0:v]fade=t=in:d=0.4,fade=t=out:st=19.4:d=0.6,{tv}[v];{afx}',
     '-map', '[v]', '-map', '[a]', *enc, '-crf', '21', '-maxrate', '5500k', '-bufsize', '11000k', wide])
run([*video_in, '-filter_complex',
     f'[0:v]fade=t=in:d=0.4,fade=t=out:st=19.4:d=0.6,split[x][y];[x]scale=-2:1920,crop=1080:1920,boxblur=24:2,eq=brightness=-0.12[bg];[y]scale=1080:-2[fg];[bg][fg]overlay=0:(H-h)/2,{tv}[v];{afx}',
     '-map', '[v]', '-map', '[a]', *enc, '-crf', '22', '-maxrate', '5000k', '-bufsize', '10000k', tall])
