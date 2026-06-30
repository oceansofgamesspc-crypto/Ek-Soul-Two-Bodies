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
  generateDependencyReport,
} = require("@discordjs/voice");

const path = require("path");
const fs = require("fs");

console.log(generateDependencyReport());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Store one player/connection per server
const queues = new Map();

const SONG_NAME = "Ek Soul, Two Bodies";
const SONG_FILE = "Ek Soul, Two Bodies.mp3";

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const content = message.content.trim();
  const command = content.toLowerCase();

  // HELP COMMAND
  if (command === "!help") {
    return message.reply(
      "**🎶 Music Bot Commands**\n\n" +
        "`!play Ek Soul, Two Bodies` - Play the song\n" +
        "`!stop` - Stop song and leave VC\n" +
        "`!pause` - Pause the song\n" +
        "`!resume` - Resume the song\n" +
        "`!volume 50` - Set volume from 1 to 100\n" +
        "`!nowplaying` - Show current song\n" +
        "`!help` - Show this help menu"
    );
  }

  // PLAY COMMAND
  if (
    command === "!play ek soul, two bodies" ||
    command === "!play ek soul two bodies"
  ) {
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      return message.reply("❌ You need to join a voice channel first.");
    }

    const songPath = path.join(__dirname, "songs", SONG_FILE);

    console.log("Song path:", songPath);

    if (!fs.existsSync(songPath)) {
      console.log("Song file not found!");
      return message.reply("❌ Song file not found on server.");
    }

    let connection;

    try {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      connection.on("stateChange", (oldState, newState) => {
        console.log(`Voice connection: ${oldState.status} -> ${newState.status}`);
      });

      connection.on("error", (error) => {
        console.error("Voice connection error:", error);
      });

      console.log("Joining voice channel...");

      await entersState(connection, VoiceConnectionStatus.Ready, 60_000);

      console.log("Voice connection is READY.");

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
        message.channel.send("❌ Audio player error. Check console logs.");

        const data = queues.get(message.guild.id);
        if (data?.connection) data.connection.destroy();
        queues.delete(message.guild.id);
      });

      const resource = createAudioResource(songPath, {
        inlineVolume: true,
      });

      resource.volume.setVolume(1.0);

      connection.subscribe(player);
      player.play(resource);

      queues.set(message.guild.id, {
        connection,
        player,
        resource,
        songName: SONG_NAME,
        volume: 100,
      });

      console.log("Play command executed.");

      message.reply(`🎶 Playing **${SONG_NAME}** in your voice channel.`);

      player.on(AudioPlayerStatus.Idle, () => {
        console.log("Player became idle.");

        const data = queues.get(message.guild.id);

        if (data?.connection) {
          data.connection.destroy();
        }

        queues.delete(message.guild.id);
      });
    } catch (error) {
      console.error("Main voice error:", error);

      if (connection) {
        connection.destroy();
      }

      queues.delete(message.guild.id);

      message.reply("❌ Failed to connect to voice properly. Check console logs.");
    }

    return;
  }

  // WRONG PLAY COMMAND
  if (command.startsWith("!play")) {
    return message.reply("❌ Song not found. Try: `!play Ek Soul, Two Bodies`");
  }

  // STOP COMMAND
  if (command === "!stop") {
    const data = queues.get(message.guild.id);

    if (!data) {
      return message.reply("❌ Nothing is playing right now.");
    }

    data.player.stop();

    if (data.connection) {
      data.connection.destroy();
    }

    queues.delete(message.guild.id);

    return message.reply("⏹️ Stopped the song and left the voice channel.");
  }

  // PAUSE COMMAND
  if (command === "!pause") {
    const data = queues.get(message.guild.id);

    if (!data) {
      return message.reply("❌ Nothing is playing right now.");
    }

    const paused = data.player.pause();

    if (!paused) {
      return message.reply("❌ Could not pause the song.");
    }

    return message.reply("⏸️ Song paused.");
  }

  // RESUME COMMAND
  if (command === "!resume") {
    const data = queues.get(message.guild.id);

    if (!data) {
      return message.reply("❌ Nothing is playing right now.");
    }

    const resumed = data.player.unpause();

    if (!resumed) {
      return message.reply("❌ Could not resume the song.");
    }

    return message.reply("▶️ Song resumed.");
  }

  // VOLUME COMMAND
  if (command.startsWith("!volume")) {
    const data = queues.get(message.guild.id);

    if (!data) {
      return message.reply("❌ Nothing is playing right now.");
    }

    const args = command.split(" ");
    const volumeNumber = Number(args[1]);

    if (!volumeNumber || volumeNumber < 1 || volumeNumber > 100) {
      return message.reply("❌ Use volume like this: `!volume 50`");
    }

    const volume = volumeNumber / 100;

    data.resource.volume.setVolume(volume);
    data.volume = volumeNumber;

    return message.reply(`🔊 Volume set to **${volumeNumber}%**.`);
  }

  // NOW PLAYING COMMAND
  if (command === "!nowplaying" || command === "!np") {
    const data = queues.get(message.guild.id);

    if (!data) {
      return message.reply("❌ Nothing is playing right now.");
    }

    return message.reply(
      `🎧 Now playing: **${data.songName}**\n` +
        `🔊 Volume: **${data.volume}%**`
    );
  }
});

client.login(process.env.BOT_TOKEN);
