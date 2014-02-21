social.addModule("plus", null, {
    name: "plus",
    oauth: {
        version: '2.0',
        redirect_uri: 'https://www.google.com/robots.txt',
        authorize_uri: 'accounts.google.com/o/oauth2/auth',
        access_token_uri: 'accounts.google.com/o/oauth2/token',
        client_id: null,
        response_type: 'token',
        access_token: null,
        refresh_token: null,
        expire_in: null,
        client_secret: 'IXcN4fSduNCT8c_ft1-fHujk',
        scope_delimiter: ' ',
        scope_default: 'https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/plus.me',
        scope: 'https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/plus.me',
        authorize_options: {},
        access_token_options: {},
        reg_authorization_code: /access_token=([^&]+)(?:&expires_in=(.*))?/
    },

    scope: {
        
    },

    authorizationCodeURL: function( scope, redirect_uri ) {
        'use strict';

        if(!scope){
            scope = this.default_scope;
        }

        this.current_scope = scope;
		
		if(redirect_uri){
			this.redirect_uri = redirect_uri;
		}

        return (this.auth_uri + '?' +
            'client_id={{CLIENT_ID}}&' +
            'redirect_uri={{REDIRECT_URI}}&' +
            'scope={{API_SCOPE}}&' +
            'access_type=offline&' +
            'approval_prompt=force&' +
            'response_type=code')
                .replace('{{CLIENT_ID}}', this.client_id)
                .replace('{{REDIRECT_URI}}', this.redirect_uri)
                .replace('{{API_SCOPE}}', scope);
    },

    parseAuthorizationCode: function(url) {
        'use strict';

        var error = url.match(/[&\?]error=([^&]+)/);
        if (error) {
            return 'Error getting authorization code: ' + error[1];
        }
    
        return url.match(/[&\?]code=([\w\/\-]+)/)[1];
    },

    accessTokenParams: function(authorizationCode) {
        'use strict';

        return {
            code: authorizationCode,
            client_id: this.client_id,
            client_secret: this.client_secret,
            redirect_uri: this.redirect_uri,
            grant_type: 'authorization_code'
        };
    },

    parseAccessToken: function(response) {
        'use strict';

        var parsedResponse = JSON.parse(response);
        return {
            access_token: parsedResponse.access_token,
            refresh_token: parsedResponse.refresh_token,
            expiresIn: parsedResponse.expires_in
        };
    },
    
    refreshTokenParams: function(){
        'use strict';
        
        return {
          client_id: this.client_id,
          client_secret: this.client_secret,
          refresh_token: this.refresh_token,
          grant_type: 'refresh_token'
        };
    },
    
    parseRefreshToken: function(response){
        'use strict';

        var parsedResponse = JSON.parse(response);
        return {
            access_token: parsedResponse.access_token,
            expiresIn: parsedResponse.expires_in,
            token_type: parsedResponse.token_type
        };
    },

    parser: {
        person: function(json){
            var person = {};

            person.id           = json.id;
            person.name         = json.name;
            person.nickname     = json.nickname || "";
            person.birthday     = json.birthday;
            person.gender       = json.gender;
            person.url          = json.url;
            person.image        = json.image || "";
            person.about        = json.aboutMe || "";
            person.relationship = json.relationshipStatus || "";
            person.urls         = json.urls || [];
            person.organizations= json.organizations || [];
            person.placeLived   = json.placeLived || [];
            person.language     = json.language || "en";
            person.age          = (json.hasOwnProperty('ageRange')) ? (json.ageRange.min + json.ageRange.max) / 2 : 0;

            return person;
        },

        activity: function(json){
            var activity = {};

            activity.title      = json.title;
            activity.published  = json.published;
            activity.id         = json.id;
            activity.url        = json.url;
            activity.actor      = json.actor;
            activity.verb       = json.verb;
            activity.replies    = json.replies;
            activity.plusoners  = json.plusoners;
            activity.resharers  = json.resharers;
            activity.attachments= json.attachments;
            
            return activity;
        },

        activities: function(json){
            var activities = [];

                activities.updated = json.updated;

            activities.activities = [];
            for(var i = 0, j = json.items.length; i < j; i += 1){
                activities.activities[i] = this.activity(json.items[i]);
            }

            return activities;
        }
    },

    api: {
        //https://developers.google.com/+/api/latest/people/get
        getPeople: function( userId ){
            return {
                method: "GET",
                url: "https://www.googleapis.com/plus/v1/people/" + userId,
                data_merge: null,
                scope: true,
                parser: 'person'
            };
        },

        //https://developers.google.com/+/api/latest/people/search
        searchPeople: function( query, lang, maxResults, pageToken ){
            return{
                method: "GET",
                url: "https://www.googleapis.com/plus/v1/people", 
                data_merge: {
                    query: query,
                    lang: lang || null,
                    maxResults: maxResults || null,
                    pageToken: pageToken || null
                },
                scope: true,
                parser: person
            };
        },

        //https://developers.google.com/+/api/latest/people/listByActivity
        listByActivityPeople: function( activityId, collection, maxResults, pageToken ){
            return{
                method: "GET",
                url: "https://www.googleapis.com/plus/v1/activities/" + activityId + "/people/" + collection,
                data_merge: {
                    maxResults: maxResults || null,
                    pageToken: pageToken || null
                },
                scope: true
            };
        },

        //https://developers.google.com/+/api/latest/people/list
        listPeople: function( collection, userId, maxResults, orderBy, pageToken ){
             return{
               method: "GET",
               url: "https://www.googleapis.com/plus/v1/people/" + userId + "/people/" + collection,
               data_merge: {
                   maxResults: maxResults || null,
                   orderBy: orderBy || null,
                   pageToken: pageToken || null
               },
               scope: true
            };
        },

        //https://developers.google.com/+/api/latest/activities/list
        listActivities: function( collection, userId, maxResults, pageToken ){
            return{
              method: "GET",
              url: "https://www.googleapis.com/plus/v1/people/" + userId + "/activities/" + collection,
              data_merge: {
                  maxResults: maxResults || null,
                  pageToken: pageToken || null
              },
              scope: true,
              parser: 'activities'
            };
        },

        //https://developers.google.com/+/api/latest/activities/get
        getActivity: function( activityId ){
            return{
                method: "GET",
                url: "https://www.googleapis.com/plus/v1/activities/" + activityId,
                data_merge: null,
                scope: true,
                parser: 'activity'
            };
        },

        //https://developers.google.com/+/api/latest/activities/search
        searchActivity: function( query, lang, maxResults, orderBy, pageToken ){
            return{
                method: "GET",
                url: "https://www.googleapis.com/plus/v1/activities", 
                data_merge: {
                    query: query,
                    lang: lang || null,
                    maxResults: maxResults || null,
                    orderBy: orderBy || null,
                    pageToken: pageToken || null
                },
                scope: true,
                parser: 'activity'
            };
        },

        //https://developers.google.com/+/api/latest/comments/list
        listComments: function( activityId, maxResults, pageToken, sortOrder ){
            return{
                method: "GET",
                url: "https://www.googleapis.com/plus/v1/activities/" + activityId + "/comments", 
                data_merge: {
                    maxResults: maxResults || null,
                    pageToken: pageToken || null,
                    sortOrder: sortOrder || null
                },
                scope: true
            };
        },

        //https://developers.google.com/+/api/latest/comments/get
        getComment: function( commentId ){
            return{
              method: "GET",
              url: "https://www.googleapis.com/plus/v1/comments/" + commentId,
              data_merge: null,
              scope: true
            };
        },

        me: function(){
            return this.getPeople( 'me' );
        },
        
        following: function(){
            return this.listPeople( 'visible', 'me' );
        },

        people: function( UserId ){
            return this.getPeople( UserId );
        },

        activity: function( activityId ){
            return this.getActivity( activityId );
        },

        activities: function(){
            return this.listActivities( 'public', 'me' );
        }
    }
});