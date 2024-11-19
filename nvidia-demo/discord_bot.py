import discord
import os

class MyClient(discord.Client):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.log_channel_id = int(os.getenv('DISCORD_LOG_CHANNEL_ID', 0))

    async def on_ready(self):
        await self.send_log_message(f'Logged in as {self.user}')

    async def on_message(self, message):
        if message.author.bot:
            return

    async def send_log_message(self, content):
        if self.log_channel_id:
            print(f"Attempting to access channel ID: {self.log_channel_id}")
            channel = self.get_channel(self.log_channel_id)
            if channel:
                try:
                    await channel.send(content)
                except Exception as e:
                    print(f"Failed to send message: {e}")
            else:
                print(f"Channel with ID {self.log_channel_id} not found.")
        else:
            print("Log channel ID not set.")

def create_discord_client():
    intents = discord.Intents.default()
    intents.message_content = True
    return MyClient(intents=intents)