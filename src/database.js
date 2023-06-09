import {DataTypes, Sequelize} from 'sequelize';

export default class Database {

    TweetStatus = {
        Pending: 'pending',
        Approved: 'approved',
        Ignored: 'ignored'
    };

    Tweet = null;
    sequelize = null;
    static instance = null;

    /**
     * Gets the singleton instance of the database object
     */
    static getInstance() {
        if (!Database.instance) Database.instance = new Database();
        return Database.instance;
    }

    /**
     * Initializes the databases, makes sure all the models,
     * necessary tables and the connection works
     * @returns {Promise<Database>}
     */
    async init() {
        this.sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: 'bot.db',
            logging: false
        });

        // Ensure the connection works
        await this.sequelize.authenticate();

        // Define the Tweet model
        this.Tweet = this.sequelize.define('Tweet', {
            id: {
                type: DataTypes.BIGINT,
                primaryKey: true
            },
            content: DataTypes.STRING,
            status: DataTypes.STRING
        }, {
            timestamps: false
        });

        // Ensure the database is up-to-date
        await this.Tweet.sync();

        return this;
    }

    /**
     * Get a specific stored Tweet by its Twitter ID
     * @param id Its Twitter ID
     * @returns {Promise<Model|null>} The retrieved model or null
     */
    async getTweet(id) {
        return await this.Tweet.findByPk(id);
    }

    async createTweet(id, content, status) {
        /**
         * Create a new stored Tweet
         * @param id The Twitter ID of the Tweet
         * @param content The content of the Tweet
         * @param status The status of the Tweet, such as pending, approved or ignored
         * @returns {Promise<*>}
         */
        return await this.Tweet.create({
            id, content, status
        });
    }

}