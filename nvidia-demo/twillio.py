import os
from pydub import AudioSegment
from fastapi import WebSocket
from fastapi.websockets import WebSocketDisconnect
from vad import get_speech_prob
from alex import call_to_whisper, queue_out

import base64
import io
import json

# Constants and configurations
SHOW_TIMING_MATH = False
LOG_EVENT_TYPES = [
    'error', 'response.content.done', 
    'response.done', 'input_audio_buffer.committed',
    'input_audio_buffer.speech_stopped', 'input_audio_buffer.speech_started',
    'session.created'
]

async def receive_from_twilio(websocket: WebSocket, openai_ws, mark_queue, latest_media_timestamp, stream_sid):
    try:
        async for message in websocket.iter_text():
            data = json.loads(message)
            if data['event'] == 'media' and openai_ws.open:
                latest_media_timestamp[0] = int(data['media']['timestamp'])
                audio_append = {
                    "type": "input_audio_buffer.append",
                    "audio": data['media']['payload']                }
                await openai_ws.send(json.dumps(audio_append))
            elif data['event'] == 'start':
                stream_sid[0] = data['start']['streamSid']
                print(f"Incoming stream has started {stream_sid[0]}")
                latest_media_timestamp[0] = 0
            elif data['event'] == 'mark' and mark_queue:
                mark_queue.pop(0)
    except WebSocketDisconnect:
        if openai_ws.open:
            await openai_ws.close()

async def send_to_twilio(twillio_ws: WebSocket, openai_ws, mark_queue, latest_media_timestamp, stream_sid, last_assistant_item, response_start_timestamp_twilio):
    try:
        async for openai_message in openai_ws:
            response = json.loads(openai_message)
            # if response['type'] in LOG_EVENT_TYPES:                
            # get message from openai_ws
            if response.get('type') == 'response.audio.delta' and 'delta' in response:
                print(json.dumps(response, indent=2))
                audio_payload = base64.b64encode(base64.b64decode(response['delta'])).decode('utf-8')
                audio_delta = {
                    "event": "media",
                    "streamSid": stream_sid[0],
                    "media": {
                        "payload": audio_payload
                    }
                }                
                # send msg back to user's phone
                await twillio_ws.send_json(audio_delta)
                if response_start_timestamp_twilio[0] is None:
                    response_start_timestamp_twilio[0] = latest_media_timestamp[0]
                    if SHOW_TIMING_MATH:
                        print(f"Setting start timestamp for new response: {response_start_timestamp_twilio[0]}ms")
                if response.get('item_id'):
                    last_assistant_item[0] = response['item_id']
                await send_mark(twillio_ws, mark_queue, stream_sid[0])
                
            if response.get('type') == 'input_audio_buffer.speech_started':
                print("Speech started detected.")
                if last_assistant_item[0]:
                    print(f"Interrupting response with id: {last_assistant_item[0]}")
                    await handle_speech_started_event(openai_ws, twillio_ws, mark_queue, latest_media_timestamp[0], stream_sid[0], last_assistant_item, response_start_timestamp_twilio)
    except Exception as e:
        print(f"Error in send_to_twilio: {e}")

async def handle_speech_started_event(openai_ws, websocket, mark_queue, latest_media_timestamp, stream_sid, last_assistant_item, response_start_timestamp_twilio):
    print("Handling speech started event.")
    if mark_queue and response_start_timestamp_twilio[0] is not None:
        elapsed_time = latest_media_timestamp - response_start_timestamp_twilio[0]
        print(f"Calculating elapsed time for truncation: {elapsed_time}ms")

        if last_assistant_item[0]:
            if SHOW_TIMING_MATH:
                print(f"Truncating item with ID: {last_assistant_item[0]}, Truncated at: {elapsed_time}ms")

            truncate_event = {
                "type": "conversation.item.truncate",
                "item_id": last_assistant_item[0],
                "content_index": 0,
                "audio_end_ms": elapsed_time
            }
            await openai_ws.send(json.dumps(truncate_event))

        await websocket.send_json({
            "event": "clear",
            "streamSid": stream_sid
        })

        mark_queue.clear()
        last_assistant_item[0] = None
        response_start_timestamp_twilio[0] = None

async def send_mark(connection, mark_queue, stream_sid):
    if stream_sid:
        mark_event = {
            "event": "mark",
            "streamSid": stream_sid,
            "mark": {"name": "responsePart"}
        }
        await connection.send_json(mark_event)
        mark_queue.append('responsePart')
        
async def receive_from_twilio_dummy(openai_ws, stream_sid, latest_media_timestamp, mark_queue):
    try:
        msgs = []
        with open("dummy.input", "r") as f:
            msgs = f.readlines()
        for message in msgs:
            data = json.loads(message)
            if data['event'] == 'media' and openai_ws.open:
                latest_media_timestamp = int(data['media']['timestamp'])
                audio_append = {
                    "type": "input_audio_buffer.append",
                    "audio": data['media']['payload']
                }
                await openai_ws.send(json.dumps(audio_append))
            elif data['event'] == 'start':
                stream_sid = data['start']['streamSid']
                print(f"Incoming stream has started {stream_sid}")
                latest_media_timestamp = 0
            elif data['event'] == 'mark' and mark_queue:
                mark_queue.pop(0)
    except WebSocketDisconnect:
        if openai_ws.open:
            await openai_ws.close()

async def send_to_twilio_dummy(openai_ws, stream_sid, latest_media_timestamp, last_assistant_item, response_start_timestamp_twilio, mark_queue):
    try:
        async for openai_message in openai_ws:
            response = json.loads(openai_message)
            if response['type'] in LOG_EVENT_TYPES:
                print(json.dumps(response, indent=2))

            if response.get('type') == 'response.audio.delta' and 'delta' in response:
                # print(json.dumps(response, indent=2))
                audio_payload = base64.b64encode(base64.b64decode(response['delta'])).decode('utf-8')
                audio_delta = {
                    "event": "media",
                    "streamSid": stream_sid,
                    "media": {
                        "payload": audio_payload
                    }
                }
                # print(json.dumps(audio_delta, indent=2))
                

                if response_start_timestamp_twilio is None:
                    response_start_timestamp_twilio = latest_media_timestamp
                    if SHOW_TIMING_MATH:
                        print(f"Setting start timestamp for new response: {response_start_timestamp_twilio}ms")

                if response.get('item_id'):
                    last_assistant_item = response['item_id']

            if response.get('type') == 'input_audio_buffer.speech_started':
                print("Speech started detected.")
                if last_assistant_item:
                    print(f"Interrupting response with id: {last_assistant_item}")
    except Exception as e:
        print(f"Error in send_to_twilio: {e}")



FRAME_RATE = 16000
INTERVAL = 1024 * 2
DUMMY_LIMIT = 300
async def receive_from_twilio_alex_luke(websocket: WebSocket):    
    audio_bytes = bytearray()
    dummy_limit = DUMMY_LIMIT
    async for message in websocket.iter_text():
        data = json.loads(message)
        if data['event'] == 'media':
            payload = data['media']['payload']
            decoded_chunk = base64.b64decode(payload)
            audio_bytes.extend(decoded_chunk)
            # speech_probs = get_speech_prob(audio_bytes, sample_rate=FRAME_RATE)
            # print(speech_probs)
        with open("dummy-alex-luke.input", "a") as input_file:
            input_file.write(message + "\n")
        dummy_limit -= 1
        if dummy_limit <= 0:
            break
    audio_segment = AudioSegment(
        data=bytes(audio_bytes),
        frame_rate=FRAME_RATE,
        sample_width=1,
        channels=1
    )    
    SYSTEM_MESSAGE = ("You are an AI agent developed by Homebrew. You can help users with their questions, provide information, and more. Please be cheerful and helpful.")    
    messages = []
    messages.append({"role": "system", "content": SYSTEM_MESSAGE})
    audio_segment = AudioSegment(
        data=bytes(audio_bytes),
        frame_rate=FRAME_RATE,
        sample_width=1,
        channels=1
    )
    wav_io = io.BytesIO()
    audio_segment.export(wav_io, format="wav")
    wav_io.seek(0)
    audio_bytes_in_io_bytes = wav_io
    await call_to_whisper(audio_bytes_in_io_bytes, messages)
    current_path = os.path.dirname(os.path.abspath(__file__))
    file_wav_path_out = os.path.join(current_path, "dummy-alex-luke_out")
    for i, obj in enumerate(queue_out):
        file_wav_path_out += f"_{i}.wav"
        with open(file_wav_path_out, "wb") as f:
            f.write(obj)
    
    with open("dummy-alex-luke.bytes", "wb") as bytes_file:
        bytes_file.write(base64.b64encode(bytes(audio_bytes)))
    with open("dummy-alex-luke.wav", "wb") as wav_file:
        audio_segment.export(wav_file, format="wav")        
                