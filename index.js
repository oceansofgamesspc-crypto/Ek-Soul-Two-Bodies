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
  NoSubscriberBehavior,
} = require("@discordjs/voice");

const path = require("path");

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

  if (command.startsWith("!play")) {
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

    const songPath = path.join(__dirname, "songs", "Ek Soul, Two Bodies.flac");

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    const resource = createAudioResource(songPath, {
      inlineVolume: true,
    });

    resource.volume.setVolume(0.6);

    connection.subscribe(player);
    player.play(resource);

    message.reply("🎶 Playing **Ek Soul, Two Bodies** in your voice channel.");

    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });

    player.on("error", (error) => {
      console.error(error);
      message.channel.send("Something went wrong while playing the song.");
      connection.destroy();
    });
  }
});

client.login(process.env.BOT_TOKEN);