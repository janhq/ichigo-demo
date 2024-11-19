import os
import torch
import torchaudio
import numpy as np

def get_speech_prob(input_data, sample_rate=16000):
    vad_model, _ = torch.hub.load("snakers4/silero-vad", "silero_vad")
    
    # Check if input_data is a bytes object; if not, assume it's a file path
    if isinstance(input_data, bytes):
        audio_bytes = input_data
    else:
        # Load and resample the audio file
        data, original_sample_rate = torchaudio.load(input_data, normalize=True)
        arr = torchaudio.functional.resample(data, orig_freq=original_sample_rate, new_freq=sample_rate)
        audio_bytes = arr.numpy().tobytes()
    
    queue_in = []
    
    # Process the audio bytes in chunks
    for i in range(0, len(audio_bytes), 1024 * 2):
        if len(audio_bytes) - i < 1024 * 2:
            break
        audio_float32 = np.frombuffer(audio_bytes[i:i + 1024 * 2], dtype=np.float32)
        speech_prob = vad_model(torch.from_numpy(audio_float32), sample_rate).item()
        queue_in.append(speech_prob)
    
    return np.mean(queue_in), np.median(queue_in)

current_path = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(current_path, "1_output.wav")
mean_prob, median_prob = get_speech_prob(file_path)