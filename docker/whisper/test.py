import requests

formats = ["wav", "mp3", "flac", "aac", "ogg", "opus", "pcm"]
file_paths = {
    "mp3": "/home/root/BachVD/ichigo-demo/docker/whisper/samples/ref.mp3",
    "opus": "/home/root/BachVD/ichigo-demo/docker/whisper/samples/sample-3.opus",
    # Add paths to your other audio files here
}

for fmt in formats:
    try:
        with open(file_paths[fmt], "rb") as f:
            response = requests.post(
                f"http://localhost:3348/tokenize/{fmt}",
                files={"file": f}
            )
            print(f"Response for {fmt}: {response.json()}")
    except Exception as e:
        print(f"Error with {fmt}: {e}")
