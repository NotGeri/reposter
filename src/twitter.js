import OAuth from 'oauth';
import axios from 'axios';

export default class Twitter {

    AuthType = {
        Bearer: 'bearer',
        OAuth: 'oauth'
    };

    static instance = null;
    client = null;

    /**
     * Get the singleton instance of the Twitter object
     * @returns {Twitter}
     */
    static getInstance() {
        if (!Twitter.instance) Twitter.instance = new Twitter();
        return Twitter.instance;
    }

    /**
     * Create and initialize a new OAuth client for this instance
     */
    constructor() {
        this.client = new OAuth.OAuth(
            'https://api.twitter.com/oauth/request_token',
            'https://api.twitter.com/oauth/access_token',
            process.env.TWITTER_API_KEY,
            process.env.TWITTER_API_SECRET,
            '1.0A',
            null,
            'HMAC-SHA1'
        );
    }

    /**
     * Get the authentication headers for a specific endpoint
     * @param endpoint The endpoint
     * @param method The method of the request (POST for Twitter by default)
     * @returns {*} The headers
     */
    getAuthHeader = (endpoint, method = 'post') => {
        return this.client.authHeader(endpoint, process.env.TWITTER_ACCESS_TOKEN, process.env.TWITTER_ACCESS_TOKEN_SECRET, method);
    };

    /**
     * Create a new tweet
     * @param text The text of the tweet
     * @returns {Promise<any>}
     */
    sendTweet = async (text) => {
        return await this.apiRequest('/2/tweets', this.AuthType.OAuth, 'POST', {text});
    };


    /**
     * Get user IDs and other data from a list of usernames
     * @param usernames The list of usernames
     * @returns {Promise<*|*[]>}
     */
    getUserIdsFromNames = async (usernames) => {
        const response = await this.apiRequest(`/2/users/by?usernames=${usernames.join(',')}`, this.AuthType.Bearer);
        return response?.data || [];
    };

    /**
     * Create a new Twitter API request
     * @param endpoint The endpoint to create it to, such as /2/users/
     * @param auth The authentication method, such as OAuth or Bearer token
     * @param method The HTTP method, such as POST, GET, PATCH, etc
     * @param data Any additional data for write requests
     * @returns {Promise<any>}
     */
    apiRequest = async (endpoint, auth = this.AuthType.OAuth, method = 'GET', data = {}) => {
        try {
            endpoint = `https://api.twitter.com${endpoint}`;
            const response = await axios.get(endpoint, {
                headers: {
                    'authorization': auth === this.AuthType.OAuth ? this.getAuthHeader(endpoint) : `Bearer ${process.env.TWITTER_BEARER}`,
                    'content-type': 'application/json',
                    'accept': 'application/json'
                }
            });
            return response?.data;
        } catch (e) {
            return e.response || e;
        }
    };

    /**
     * Get the latest tweets of a user
     * @param userId The ID of the user
     * @param limit The max amount of tweets to get
     * @returns {Promise<any>}
     */
    getTweetsData = async (userId, limit = 100) => {
        return await this.apiRequest(`/2/users/${userId}/tweets/?max_results=${limit}`, 2);
    };


}