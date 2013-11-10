social.addModule('facebook', null, {
    name: "facebook",
    oauth: {
        version: '2.0',
        redirect_uri: 'https://www.facebook.com/connect/login_success.html',
        authorize_uri: 'www.facebook.com/dialog/oauth',
        access_token_uri: 'graph.facebook.com/oauth/access_token',
        client_id: null,
        response_type: 'token',
        access_token: null,
        refresh_token: null,
        expire_in: null,
        client_secret: null,
        scope_delimiter: ',',
        scope_default: 'user_birthday,read_stream,read_insights',
        scope: 'user_birthday,read_stream,read_insights',
        authorize_options: {},
        access_token_options: {},
        reg_authorization_code: /access_token=([^&]+)(?:&expires_in=(.*))?/
    },

    parser: {
        user: function(json){
            var user = [];

            for(var i = 0, l = json.data.length; i < l; i += 1){
                user[i] = {};
                
            }

            if(user.length === 1){
                user = user[0];
            }

            return user;
        },

        profile: function(json){
            var profile = [];

            for(var i = 0, l = json.data.length; i < l; i += 1){
                var id = json.data[i].id;
                profile[id] = {};
                    profile[id].id       = id;
                    profile[id].username = json.data[i].username;
                    profile[id].name     = json.data[i].name;
                    profile[id].pic      = json.data[i].pic;
                    profile[id].pic_big  = json.data[i].pic_big;
                    profile[id].type     = json.data[i].user;
            }

            if(profile.length === 1){
                profile = profile[0];
            }

            return profile;
        },

        friends: function(json){
            var friends = [];

            for(var i = 0, l = json.data.length; i < l; i += 1){
                friends[i] = json.data[i].uid1;
            }

            return friends;
        },

        stream: function(json){
            var stream = {};
                stream.id               = json.source_id;
                stream.post_id          = json.post_id;
                stream.time             = json.created_time;
                stream.description      = json.description;
                stream.message          = json.message;
                stream.attachment       = json.attachment;
                stream.can_comment      = json.comment_info.can_comment;
                stream.comment_count    = json.comment_info.comment_count;
                stream.comments         = [];
                stream.can_like         = json.like_info.can_like;
                stream.like_count       = json.like_info.like_count;
                stream.user_likes       = [];
                stream.can_share        = json.share_info.can_share;
                stream.share_count      = json.share_info.share_count;
                stream.subscrived       = json.subscrived;

            return stream;
        },

        streams: function(json){
            var streams = [];

            for(var i = 0, l = json.data.length; i < l; i += 1){
                streams[i] = this.stream( json.data[i] );
            }

            return streams;
        }
    },

    api: {
        //https://developers.facebook.com/docs/reference/fql/
        fql: function( query, parser, scope ){
            return {
                method: "GET",
                url: "https://graph.facebook.com/fql?q=" + encodeURI( query ) + "&access_token={{a}}",
                data_merge: null,
                scope: scope,
                parser: parser
            };
        },

        //https://developers.facebook.com/docs/reference/fql/user
        user: function( userId ){
            return this.fql( "SELECT uid, username, name, sex, status, about_me, pic, website, age_range, birthday_date, email FROM user WHERE uid " + ((typeof userId === 'object') ? "IN(" + userId.join(',') + ")" : "= " + userId), 'user', true );
        },

        //https://developers.facebook.com/docs/reference/fql/profile
        profile: function( userId ){
            return this.fql( "SELECT id, name, username, pic, pic_big, type FROM profile WHERE id " + ((typeof userId === 'object') ? "IN(" + userId.join(',') + ")" : "= " + userId), 'profile', true );  
        },

        //https://developers.facebook.com/docs/reference/fql/friend
        friends: function( userId ){
            return this.fql( "SELECT uid1 FROM friend WHERE uid2 = " + userId, 'friends', true );
        },

        searchPeople: function( peopleName ){
            
        },

        //https://developers.facebook.com/docs/reference/fql/stream
        stream: function( userId ){
            return this.fql( "SELECT source_id, post_id, type, created_time, description, message, attachment, comment_info, like_info, share_info, subscribed FROM stream WHERE source_id = " + userId + " LIMIT 0, 100", 'streams', true );
        },

        me: function(){
            return this.profile('me()');
        },
    }
});
