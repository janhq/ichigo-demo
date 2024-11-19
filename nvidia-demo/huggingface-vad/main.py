import torch
import torchaudio
import numpy as np
import time
import os

sample_rate = 16000
vad_model, _ = torch.hub.load("snakers4/silero-vad", "silero_vad")

queue_in = []

current_path = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(current_path, "1_output.wav")
data = torchaudio.load(file_path, normalize=True)
arr = torchaudio.functional.resample(
    data[0], orig_freq=data[1], new_freq=16000)
byte = arr.numpy().tobytes()
c = 0


start = time.time()
for i in range(0, len(byte), 1024*2):
    if len(byte)-i < 1024*2:
        break
    c += 1
    # queue_in.append(byte[i:i+1024*2])
    audio_float32 = np.frombuffer(byte[i:i+1024*2], dtype=np.float32)
    speech_prob = vad_model(torch.from_numpy(
        audio_float32), sample_rate).item()
    queue_in.append(speech_prob)
    print(speech_prob)
end = time.time()

print("Process time per :", (end-start)/len(queue_in))
print(np.mean(queue_in))
print(np.median(queue_in))
# time.sleep(10000)