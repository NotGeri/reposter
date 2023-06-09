import 'dotenv/config';
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Events, GatewayIntentBits} from 'discord.js';
import Twitter from './twitter.js';
import Database from './database.js';

// Initialize the database
const database = Database.getInstance();
await database.init();

// Create a new Discord API client with the necessary
// perms to read and send messages in guilds.
const discord = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]});

// Initialize the Twitter API client
const twitter = Twitter.getInstance();

// We need to store the retriever scheduled task
// and the Discord channel to send message in
let tweetRetriever, channel = null;

/**
 * Go through and retrieve all recent Tweets and
 * attempt to update them in the database and
 * send the appropriate messages on Discord.
 * @returns {Promise<void>}
 */
const updateTweets = async () => {
    // Retrieve the user's ID from their username
    const username = 'NotGeriK';
    let userId = null;
    const userIds = await twitter.getUserIdsFromNames([username]);
    if (userIds.length > 0) userId = userIds[0]?.id;
    if (!userId) {
        console.warn(`Unable to update Tweets, user ID invalid!`);
        return;
    }

    // Get all recent Tweets from the user
    const tweetsData = await twitter.getTweetsData(userId, 10);
    const tweets = tweetsData?.data || [];
    for (const tweet of tweets) {
        if (!tweet || !tweet.id) continue;

        // Check and skip if we already stored this Tweet before
        let storedTweet = await database.getTweet(tweet.id);
        if (storedTweet) continue;

        // Store it in the database if we have not
        try {
            storedTweet = await database.createTweet(tweet.id, tweet.text, database.TweetStatus.Pending);
        } catch (e) {
            console.warn(`Unable to save Tweet #${tweet.id}: ${e.message || e}`);
            continue;
        }

        const approve = new ButtonBuilder()
            .setCustomId(`approve:${tweet.id}`)
            .setLabel('Approve Tweet')
            .setStyle(ButtonStyle.Success);

        const ignore = new ButtonBuilder()
            .setCustomId(`ignore:${tweet.id}`)
            .setLabel('Ignore Tweet')
            .setStyle(ButtonStyle.Secondary);


        // Send the Discord message with the buttons
        channel.send({
            content: `https://twitter.com/${username}/status/${tweet.id}`,
            components: [new ActionRowBuilder().addComponents(approve, ignore)]
        });

    }
};

// See when we can start interacting
// with the Discord API
discord.once(Events.ClientReady, async client => {
    console.log(`Done! Logged in as ${client.user.tag}`);

    // Check if the channel exists and store it if so
    channel = await discord.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    if (!channel) {
        console.error(`Unable to find channel, aborting..`);
        process.exit(1);
    }

    // Do the initial update
    await updateTweets();

    // Set up scheduler to do it every X minutes
    tweetRetriever = setInterval(updateTweets, process.env.INTERVAL_SECONDS * 1000);
});

discord.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    switch (interaction.customId) {
        case 'approve':
            await interaction.message.channel.send('approved');
            await interaction.deferUpdate();
            break;
        case 'ignore':
            await interaction.message.channel.send('ignored');
            await interaction.deferUpdate();
            break;
    }
});

// Log in and initialize the Discord API client
discord.login(process.env.DISCORD_BEARER);

