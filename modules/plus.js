social.addModule("plus", null, {
    name: "plus",
    client_id: null,
    access_token: null,
    refresh_token: null,
    expireIn: null,
    client_secret: 'IXcN4fSduNCT8c_ft1-fHujk',
    redirect_uri: 'https://www.google.com/robots.txt',
    accessTokenURL: 'https://accounts.google.com/o/oauth2/token',
    accessTokenMethod: 'POST',
    refreshTokenUrl: 'https://accounts.google.com/o/oauth2/token',
    refreshTokenMethod: 'POST',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    base_uri: '',
    default_scope: 'https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/plus.me',
    current_scope: null,

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
        },

        activities: function(json){
            var activities = [];

            for(var i = 0, j = json.length; i < j; i += 1){
                activities[i] = this.activity(json[i]);
            }
            
            return activities;
        }
    },

    api: {
        //https://developers.google.com/+/api/latest/people/get
        getPeople: function( userId ){
            return {
                method: "GET",
                url: "https://www.googleapis.com/plus/v1/people/" + userId + "?access_token={{a}}",
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
                    pageToken: pageToken || null,
                    access_token: '{{a}}'
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
                    pageToken: pageToken || null,
                    access_token: '{{a}}'
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
                   pageToken: pageToken || null,
                   access_token: '{{a}}'
               },
               scope: current_scope === "https://www.googleapis.com/auth/plus.login"
            };
        },

        //https://developers.google.com/+/api/latest/activities/list
        listActivities: function( collection, userId, maxResults, pageToken ){
            return{
              method: "GET",
              url: "https://www.googleapis.com/plus/v1/people/" + userId + "/activities/" + collection,
              data_merge: {
                  maxResults: maxResults || null,
                  pageToken: pageToken || null,
                  access_token: '{{a}}'
              },
              scope: true,
              parser: 'activities'
            };
        },

        //https://developers.google.com/+/api/latest/activities/get
        getActivity: function( activityId ){
            return{
                method: "GET",
                url: "https://www.googleapis.com/plus/v1/activities/" + activityId + "?access_token={{a}}",
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
                    pageToken: pageToken || null,
                    access_token: '{{a}}'
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
                data_mege: {
                    maxResults: maxResults || null,
                    pageToken: pageToken || null,
                    sortOrder: sortOrder || null,
                    access_token: '{{a}}'
                },
                scope: true
            };
        },

        //https://developers.google.com/+/api/latest/comments/get
        getComment: function( commentId ){
            return{
              method: "GET",
              url: "https://www.googleapis.com/plus/v1/comments/" + commentId + "?access_token={{a}}",
              data_merge: null,
              scope: true
            };
        },

        me: function(){
            return this.getPeople( "me" );
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