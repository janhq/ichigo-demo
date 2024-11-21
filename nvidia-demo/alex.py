import os
import aiohttp

import asyncio

import time
import json

import sys
import io

messages = [{"role": "system", "content":
             "You are a intelligent assistant."}]
example_tts_body = {
    "text": "text to convert to sppech",
    "reference_id": "random",
    "normalize": True,
    "format": "wav",
    "latency": "balanced",
    "max_new_tokens": 4096,
    "chunk_length": 200,
    "repetition_penalty": 1.5,
}

queue_out = []
async def call_to_whisper(file: io.BytesIO, messages: list):
    data = aiohttp.FormData()
    data.add_field('file',
                   file,
                   filename=f"file.wav",
                   content_type="audio/wav")
    async with aiohttp.ClientSession() as session:
        async with session.post("http://192.168.100.111:3348/tokenize", data=data) as response:
            
            res = await response.json()
    content = res["tokens"]
    final = await call_to_tts(content,messages=messages)
    messages.append({"role": "user", "content": content})
    messages.append({"role": "assistant", "content": final})
    return messages


async def call_to_tts(content: str, messages):
    # global messages
    messages.append({"role": "user", "content": content})
    body = {"model": "exllama", "messages": messages,
            "stream": True, "max_tokens": 120}
    final_answer = ""
    answer = ""
    tokens_processed = 0
    chunk_size = 10
    currentCount = 0
    async with aiohttp.ClientSession() as session:
        async with session.post("http://192.168.100.111:5000/v1/chat/completions", json=body, headers={"Accept": "text/event-stream"}) as response:
            async for line in response.content:
                # print(line)
                # add logic here to parse the line and call to tts endpoint
                line = line.decode("utf-8")
                if line.startswith("data: "):
                    line = line[6:]
                    if line.startswith("[DONE]"):
                        if answer:
                            await send_to_tts(session, answer)
                            print(answer)
                        break
                    object = json.loads(line)

                    if object["choices"][0]["delta"].get("content"):
                        delta_content = object["choices"][0]["delta"]["content"]
                        final_answer += delta_content

                        if currentCount < chunk_size:
                            answer += delta_content
                        elif currentCount < 60 and delta_content in [".", ",", ":", ";"]:
                            await send_to_tts(session, answer)
                            print(answer)
                            answer = ""  # Reset answer
                            currentCount = 0
                            chunk_size = 60
                        elif chunk_size == 10:
                            answer += delta_content
                        else:
                            await send_to_tts(session, answer)
                            print(answer)
                            answer = delta_content  # Reset answer
                            currentCount = 0
                            if chunk_size == 60:
                                chunk_size = 200

                        tokens_processed += 1
                        currentCount += 1

    print("Final: ", final_answer)
    return final_answer


async def send_to_tts(session, text):
    example_tts_body["text"] = text
    async with session.post("http://192.168.100.111:22311/v1/tts", json=example_tts_body) as response:
        queue_out.append(await response.read())


async def main():
    global messages
    while True:
        bytes = "get input audio bytes"
        messages = await call_to_whisper(bytes, messages)

current_path = os.path.dirname(os.path.abspath(__file__))
file_wav_path = os.path.join(current_path, "dummy-alex-luke.wav")
file_wav_path_out = os.path.join(current_path, "dummy-alex-luke_out")



if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    with open(file_wav_path, "rb") as f:
        file = io.BytesIO(f.read())
    loop.run_until_complete(call_to_whisper(file,messages=messages))
    print(len(queue_out))
    for i, obj in enumerate(queue_out):
        file_wav_path_out += f"_{i}.wav"
        with open(file_wav_path_out, "wb") as f:
            f.write(obj)
