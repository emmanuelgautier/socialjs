social.addModule("twitter", null, {
    name: "twitter",
    oauth: {
        version: '1.0',
        authorize_uri: 'api.twitter.com/oauth/authorize',
        reg_oauth_token: /oauth_token=([^&]+)(?:&oauth_verifier=([^&]+))?/,
        request_token_uri: 'api.twitter.com/oauth/request_token',
        access_token_uri: 'api.twitter.com/oauth/access_token',
        reg_request_token: /oauth_token=([^&]+)(?:&oauth_callback_confirmed=(.*))?/,
        access_token_uri: 'api.twitter.com/oauth/access_token',
        reg_access_token: /oauth_token=([^&]+)(?:&oauth_token_secret=([^&]+))(?:&user_id=([^&]+))(?:&screen_name=([^&]+))?/,
        consumer_key: 'EcWebn9hDOHy613YIR53rw',
        consumer_secret: '0Mqepe07PJ5j8cFHA8IbnJigBYUYppn5z882xpIGOo',
        signature_method: 'HMAC-SHA1',
        callback_url: 'https://twitter.com/robots.txt',
        oauth_token: null,
        oauth_token_secret: null
    },

    parser: {

    },

    api: {
        verify_credential: function(includeEntities, skipStatus){
            return {
                method: "GET",
                url: "https://api.twitter.com/1.1/account/verify_credentials.json",
                data_merge: {
                    include_entities: includeEntities | false,
                    skip_status: skipStatus | true
                },
                scope: true
            };
        },

        user: function(userId, screenName, includeEntities){
            return{
                method: "GET",
                url: "https://api.twitter.com/1.1/users/show.json", 
                data_merge: {
                    user_id: userId,
                    screen_name: screenName,
                    include_entities: includeEntities || false
                },
                scope: true
            };
        },

        me: function(){
            return this.verify_credential(true, false);
        }
    }
});
