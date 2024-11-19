import base64
import os
import torch
import torchaudio
import numpy as np


INTERVAL = 1024 * 2

def get_speech_prob(input_data, sample_rate=16000):
    vad_model, _ = torch.hub.load("snakers4/silero-vad", "silero_vad", verbose=False)    
    
    if isinstance(input_data, bytes) or isinstance(input_data, bytearray):
        audio_bytes = input_data
    else:
        data, original_sample_rate = torchaudio.load(input_data, normalize=True, verbose=False)
        arr = torchaudio.functional.resample(data, orig_freq=original_sample_rate, new_freq=sample_rate)
        audio_bytes = arr.numpy().tobytes()
    
    queue_in = []    
    for i in range(0, len(audio_bytes), INTERVAL):
        if len(audio_bytes) - i < INTERVAL:
            break
        audio_float32 = np.frombuffer(audio_bytes[i:i + INTERVAL], dtype=np.float32)
        speech_prob = vad_model(torch.from_numpy(audio_float32), sample_rate).item()
        queue_in.append(speech_prob)
    
    # return np.mean(queue_in), np.median(queue_in)
    return queue_in

# current_path = os.path.dirname(os.path.abspath(__file__))

# file_wav_path = os.path.join(current_path, "dummy-alex-luke.wav")
# mean_prob_wav, median_prob_wav = get_speech_prob(file_wav_path)

# file_encoded_bytes_path = os.path.join(current_path, "dummy-alex-luke.bytes")
# with open(file_encoded_bytes_path, "rb") as f:
#     encoded_bytes = f.read()
# decoded_bytes = base64.b64decode(encoded_bytes)
# mean_prob_bytes, median_prob_bytes = get_speech_prob(decoded_bytes)


# print(f"Mean probability (WAV): {mean_prob_wav}")
# print(f"Median probability (WAV): {median_prob_wav}")
# print(f"Mean probability (bytes): {mean_prob_bytes}")
# print(f"Median probability (bytes): {median_prob_bytes}")