import os
import json
import base64
import asyncio
import time
import websockets
import nest_asyncio
import uvicorn
from fastapi import FastAPI, WebSocket, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.websockets import WebSocketDisconnect
from twilio.twiml.voice_response import VoiceResponse, Connect
from discord_bot import create_discord_client
from dotenv import load_dotenv
from twillio import receive_from_twilio, receive_from_twilio_dummy, send_to_twilio, handle_speech_started_event, send_mark, send_to_twilio_dummy


load_dotenv()

# Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
PORT = int(os.getenv('PORT', 5050))
SYSTEM_MESSAGE = ("You are an AI agent developed by Homebrew. You can help users with their questions, provide information, and more. Please be cheerful and helpful.")
INITIAL_MESSAGE = ("Hi!")
VOICE = 'alloy'
LOG_EVENT_TYPES = [
    'error', 'response.content.done', 
    'response.done', 'input_audio_buffer.committed',
    'input_audio_buffer.speech_stopped', 'input_audio_buffer.speech_started',
    'session.created'
]
SHOW_TIMING_MATH = False
app = FastAPI()

if not OPENAI_API_KEY:
    raise ValueError('Missing the OpenAI API key. Please set it in the .env file.')

client = create_discord_client()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(client.start(os.getenv('DISCORD_TOKEN')))

@app.get("/", response_class=JSONResponse)
async def index_page():
    await client.send_log_message("Client connected")
    return {"message": "Homebrew Media Stream Server is running!"}

@app.websocket("/media-stream")
async def handle_media_stream(websocket: WebSocket):
    await client.send_log_message("Media stream connected")
    await websocket.accept()
    async with websockets.connect(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
        extra_headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "OpenAI-Beta": "realtime=v1"
        }
    ) as openai_ws:
        await initialize_session(openai_ws)

        # Connection specific state
        stream_sid = [None]
        latest_media_timestamp = [0]
        last_assistant_item = [None]
        mark_queue = []
        response_start_timestamp_twilio = [None]

        await asyncio.gather(
            receive_from_twilio(websocket, openai_ws, mark_queue, latest_media_timestamp, stream_sid),
            send_to_twilio(websocket, openai_ws, mark_queue, latest_media_timestamp, stream_sid, last_assistant_item, response_start_timestamp_twilio)
        )

@app.api_route("/incoming-call", methods=["GET", "POST"])
async def handle_incoming_call(request: Request):
    response = VoiceResponse()
    response.say(INITIAL_MESSAGE)
    response.pause(length=1)
    response.say("O.K. you can start talking!")
    host = request.url.hostname
    connect = Connect()
    connect.stream(url=f'wss://{host}/media-stream')
    response.append(connect)
    return HTMLResponse(content=str(response), media_type="application/xml")

async def send_initial_conversation_item(openai_ws):
    initial_conversation_item = {
        "type": "conversation.item.create",
        "item": {
            "type": "message",
            "role": "user",
            "content": [
                {
                    "type": "input_text",
                    "text": "Hello there! I am an AI voice assistant powered by Homebrew and the Ichigo Realtime API. You can ask me for facts, jokes, or anything you can imagine. How can I help you?"
                }
            ]
        }
    }
    await openai_ws.send(json.dumps(initial_conversation_item))
    await openai_ws.send(json.dumps({"type": "response.create"}))

async def initialize_session(openai_ws):
    session_update = {
        "type": "session.update",
        "session": {
            "turn_detection": {"type": "server_vad"},
            "input_audio_format": "g711_ulaw",
            "output_audio_format": "g711_ulaw",
            "voice": VOICE,
            "instructions": SYSTEM_MESSAGE,
            "modalities": ["text", "audio"],
            "temperature": 0.8,
        }
    }
    await openai_ws.send(json.dumps(session_update))
    await send_initial_conversation_item(openai_ws)

@app.api_route("/incoming-call-test-offline", methods=["GET", "POST"])
async def handle_incoming_call_test_offline(request: Request):
    await client.send_log_message("Media stream connected")
    async with websockets.connect(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
        extra_headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "OpenAI-Beta": "realtime=v1"
        }
    ) as openai_ws:
        await initialize_session(openai_ws)

        # Connection specific state
        stream_sid = None
        latest_media_timestamp = 0
        last_assistant_item = None
        mark_queue = []
        response_start_timestamp_twilio = None        

        unix_timestamp_begin = time.time()

        await asyncio.gather(
            receive_from_twilio_dummy(openai_ws, stream_sid, latest_media_timestamp, mark_queue),
            send_to_twilio_dummy(openai_ws, stream_sid, latest_media_timestamp, last_assistant_item, response_start_timestamp_twilio, mark_queue)
        )


    return {"message": "Homebrew Media Stream Server is running!"}


if __name__ == "__main__":
    nest_asyncio.apply()
    uvicorn.run(app, host="0.0.0.0", port=PORT)