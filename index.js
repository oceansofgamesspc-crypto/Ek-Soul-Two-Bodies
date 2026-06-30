require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Events,
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  entersState,
} = require("@discordjs/voice");

const path = require("path");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const command = message.content.toLowerCase().trim();

  if (!command.startsWith("!play")) return;

  if (
    command !== "!play ek soul, two bodies" &&
    command !== "!play ek soul two bodies"
  ) {
    return message.reply("❌ Song not found. Try: `!play Ek Soul, Two Bodies`");
  }

  const voiceChannel = message.member.voice.channel;

  if (!voiceChannel) {
    return message.reply("You need to join a voice channel first.");
  }

  // IMPORTANT: Use MP3 file name exactly like this in GitHub
  const songPath = path.join(__dirname, "songs", "Ek Soul, Two Bodies.mp3");

  console.log("Song path:", songPath);

  if (!fs.existsSync(songPath)) {
    console.log("Song file not found!");
    return message.reply("❌ Song file not found on server.");
  }

  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    console.log("Joining voice channel...");

    await entersState(connection, VoiceConnectionStatus.Ready, 60_000);

    console.log("Voice connection is ready.");

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    player.on("stateChange", (oldState, newState) => {
      console.log(`Audio player: ${oldState.status} -> ${newState.status}`);
    });

    player.on("error", (error) => {
      console.error("Audio player error:", error);
      message.channel.send("❌ Audio player error. Check Railway logs.");
    });

    connection.on("stateChange", (oldState, newState) => {
      console.log(`Voice connection: ${oldState.status} -> ${newState.status}`);
    });

    const resource = createAudioResource(songPath, {
      inlineVolume: true,
    });

    resource.volume.setVolume(1.0);

    connection.subscribe(player);
    player.play(resource);

    console.log("Started playing song.");

    message.reply("🎶 Playing **Ek Soul, Two Bodies** in your voice channel.");

    player.on(AudioPlayerStatus.Idle, () => {
      console.log("Song finished or player became idle.");
      connection.destroy();
    });
  } catch (error) {
    console.error("Main voice error:", error);
    message.reply("❌ Failed to play song. Check Railway logs.");
  }
});

client.login(process.env.BOT_TOKEN);
