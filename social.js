(function( window ){
    "use strict";

    var _modules = {},

    _state = {
        //date: (new Date((new Date().getTime()) + (new Date().getTimezoneOffset() * 60 * 1000))),
        date: new Date(),
        module_loaded: [],
        last_time_caching: 0,
        last_time_changed: 0
    },

    _settings = {
        caching: false,
        interval_caching: 1000,
        timer_caching: null,
        crypt_caching: false,
        crypt_password: null,
        default_redirect_uri: null
    },

    _data = {},

    //events ['retrieving', 'loaded', 'update', 'saving']
    listeners = {},

    jsonp_counter = 0,

    temp_client_id = [],

	_window_response = null,

    in_array = function(s, arr){
        for(var i = 0, m = arr.length; i < m; i += 1){
            if(s === arr[i]){
                return 1;
            }
        }

        return 0;
    },

    _mergeData2Url = function( url, data ){
        if(!data){
            return url;
        }
        
        url += '?';
        for (var key in data) if(data.hasOwnProperty(key) && data[key] !== null){
            url += encodeURIComponent(key) + '=' +
            encodeURIComponent(data[key]) + '&';
        }

        return url;
    },

    _window_open = function(url, callback){
        var width = screen.width / 2,
            height = screen.height / 2;

        chrome.app.window.create("socialjs/popup.html?u=" + url, {
            minWidth: width,
            maxWidth: width,
            minHeight: height,
            maxHeight: height
        });
            /*var popup = window.open(
                url,
                'Authentication',
                "resizeable=true,height=" +  height + ",width=" + width + ",left="+ ((window.innerWidth - width) / 2) + ",top=" + ((window.innerHeight - height) / 2)
            );

            popup.focus();*/

            var timer = setInterval(function(){
                if(_window_response){
                    clearInterval(timer); 

                    callback({state: 1, r: _window_response});
                    _window_response = null;
                }
            }, 100);
    },

    _xhr = function( method, url, data, headers, callback ){
        if(!callback || typeof callback != 'function'){
            callback = function(e){};
        }

        var xhr = new XMLHttpRequest();

        /*if("withCredentials" in xhr && method === "GET"){
            return _jsonp(url + "&callback={{jp}}", callback);
        }*/

        if(method === "POST"){
            var f = new FormData();
            for( var x in data ){
                if( data[x] instanceof HTMLInputElement ){
                    if( "files" in data[x] && data[x].files.length > 0){
                        f.append(x, data[x].files[0]);
                    }
                }
                else{
                    f.append(x, data[x]);
                }
            }
            data = f;
        } else if (method === "GET") {
            _mergeData2Url( url, data );
            data = null;
        }

        xhr.onload = function(e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    callback({state: 1, error: null, r: xhr.responseText});
                } else if(xhr.readyState === 401){
                    callback({state: 0, error: "Access Denied"});
                } else {
                    callback({state: 0, error: "XHR status response is " + xhr.status});
                }
            }
        };

        xhr.onerror = function(e){
            callback({state: 0, error: e});
        };

        xhr.open(method, url, true);

        if(headers){
            for( var x in headers){
                xhr.setRequestHeader(x, headers[x], false);
            }
        }

        xhr.send(data);
    },

    _jsonp = function( url, callback ){
        var cb_name = "__cb_jsonp" + (jsonp_counter++),
        result,
        script = document.createElement("script");

        // Add callback to the window object
        window[cb_name] = function(json){
            result = json;
            try{
                delete window[cb_name];
            }catch(e){}
        };

        script.type = "text/javascript";
        script.src = url.replace("{{jp}}", cb_name);
        script.onreadystatechange = function(){
            if(/loaded|complete/i.test(this.readyState)){
                callback(result);
            }
        };
        document.head.appendChild( script );
    },

    apply_settings = function( sett ){
        sett = sett || {};

        var old_settings = _settings;

        for(var x in sett){
            if(x in _settings){
                _settings[ x ] = sett[x];
            }
        }

        if(_settings.caching !== old_settings.caching){
            if(_settings.caching){
                social.enableCaching();
            } else {
                social.disableCaching();
            }
        }

        _state.last_time_changed = _state.date.getTime();
    },

    loadModule = function( moduleName ){
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'socialjs/modules/' + moduleName + '.js';
        document.head.appendChild( script );

        _state.module_loaded.push(moduleName);
    },

    trigger = function(module, ev, callback){
        if(module) {
            listeners[module] = listeners[module] || {};
            listeners[module][ev] = callback;
        } else {
            listeners[ev] = callback;
        }
    },

    codingImprovement = function( name ){
        window.social[ name ] = {};

            window.social[name].login       = function( fn ){ window.social.login( name, fn); };
            window.social[name].isLogged    = function(){ return window.social.isLogged( name ); };
            /*window.social[name].set         = function( key, data ){ window.social.cache.set( name, key, data); };
            window.social[name].get         = function( key ){ return window.social.cache.get( name, key ); };*/

        for(var api in _modules[ name ].api){
            //protect some functions
            if(api === 'login' || api === 'isLogged' || api === 'set' || api === 'get'){
                continue;
            }

            window.social[ name ][ api ] = (function(name, api){ return function() { window.social.api.apply(this, [ name + '.' + api ].concat(Array.prototype.slice.call(arguments)) ); }; })(name, api);
        }
    },

    cache = {
        cacheobject: {
            crypt: false,
            data: null
        },

        clear: function(){
            //delete localStorage.social;
        },

        crypt: function( str ){
            return str;
        },

        decrypt: function( str ){
            return str;
        },

        hasCache: function(){
            //return localStorage.hasOwnProperty( 'social' );
        },

        store: function( data ){
            if(_settings.crypt_caching){
                data = cache.crypt( data );
                this.cacheobject.crypt = true;
            } else {
                this.cacheobject.crypt = false;
            }

            this.cacheobject.data = data;

            //localStorage.social = JSON.stringify( this.cacheobject );
        },

        get: function(){
            if(!this.hasCache()){
                return;
            }

            //var d = JSON.parse( localStorage.social );

            if(d.crypt === true){
                return this.decrypt( d.data );
            } else {
                return d.data;
            }
        },

        update: function(){
            if(listeners.hasOwnProperty('saving')){
                listeners.saving();
            }

            if(_state.last_time_caching < _state.last_time_changed){
                var config_module = {};

                for(var x in _modules){
                    config_module[x] = {};
                    config_module[x].name = _modules[x].name;
                    config_module[x].client_id = _modules[x].oauth.client_id;
                    config_module[x].access_token = _modules[x].oauth.access_token;
                    config_module[x].refresh_token = _modules[x].oauth.refresh_token;
                    config_module[x].expires_in = _modules[x].oauth.expires_in;
                }

                var d = {
                    'settings': _settings,
                    'data': _data,
                    'modules': config_module
                };

                this.store( d );

                _state.last_time_caching = _state.date.getTime();
            }

            if(listeners.hasOwnProperty('saved')){
                listeners.saved();
            }
        }
    },

    _oauth = {
        oauth1: {
            generate_nonce: function(){
                var nonce = '';
                for(var i = 0; i < 3; i += 1){
                    nonce += Math.random().toString(36).substring(6);
                }

                return nonce;
            },

            authenticate: function( module, callback ){
                var that = this;

                this.request_token( _modules[ module ].oauth.request_token_uri, _modules[ module ].oauth.consumer_key, _modules[ module ].oauth.consumer_secret, _modules[ module ].oauth.signature_method, _modules[ module ].oauth.callback_url, null, function(r){
                    var request_token = r.r.match( _modules[ module ].oauth.reg_request_token );

                    _window_open( "https://" + _modules[ module ].oauth.authorize_uri + "?oauth_token=" + request_token[1], function(r){
                        var request_token = decodeURIComponent( r.r.url ).match( _modules[ module ].oauth.reg_oauth_token );

                        that.access_token( _modules[ module ].oauth.access_token_uri, _modules[ module ].oauth.consumer_key, _modules[ module ].oauth.consumer_secret, _modules[ module ].oauth.signature_method, null, request_token[1], request_token[2], function(r){
                            var oauth_token = r.r.match( _modules[ module ].oauth.reg_access_token );

                            _modules[ module ].oauth.oauth_token = oauth_token[1];
                            _modules[ module ].oauth.oauth_token_secret = oauth_token[2];
                            _modules[ module ].login = true;
                        });
                    } );
                });
            },

            request_token: function( uri, consumer_key, consumer_secret, signature_method, oauth_callback, version, callback ){
                var method = 'GET',
                    url = 'https://' + uri,
                    parameters = {
                        oauth_callback: oauth_callback,
                        oauth_consumer_key: consumer_key,
                        oauth_nonce: this.generate_nonce(),
                        oauth_signature_method: signature_method,
                        oauth_timestamp: Math.round(+_state.date / 1000),
                        oauth_version: version || "1.0"
                    };

                parameters.oauth_signature = oauthSignature.generate(method, url, parameters, consumer_secret);

                var header_oauth = 'OAuth oauth_callback="' + encodeURIComponent( parameters.oauth_callback ) + '",'
                + 'oauth_consumer_key="' + consumer_key + '",'
                + 'oauth_nonce="' + parameters.oauth_nonce + '",'
                + 'oauth_signature="' + parameters.oauth_signature + '",'
                + 'oauth_signature_method="' + signature_method + '",'
                + 'oauth_timestamp="' + parameters.oauth_timestamp + '",'
                + 'oauth_version="' + parameters.oauth_version + '"',
                header = {
                    Authorization: header_oauth
                };

                _xhr(method, url, null, header, callback);
            },

            access_token: function( uri, consumer_key, consumer_secret, signature_method, version, token, verifier, callback ){
                var method = 'GET',
                    url = 'https://' + uri,
                    parameters = {
                        oauth_consumer_key: consumer_key,
                        oauth_nonce: this.generate_nonce(),
                        oauth_signature_method: signature_method,
                        oauth_timestamp: Math.round(+_state.date / 1000),
                        oauth_token: token,
                        oauth_verifier: verifier,
                        oauth_version: version || "1.0"
                    };

                parameters.oauth_signature = oauthSignature.generate(method, url, parameters, consumer_secret);

                var header_oauth = 'OAuth oauth_consumer_key="' + consumer_key + '",'
                + 'oauth_nonce="' + parameters.oauth_nonce + '",'
                + 'oauth_signature="' + parameters.oauth_signature + '",'
                + 'oauth_signature_method="' + signature_method + '",'
                + 'oauth_timestamp="' + parameters.oauth_timestamp + '",'
                + 'oauth_token="' + parameters.oauth_token + '",'
                + 'oauth_verifier="' + parameters.oauth_verifier + '",'
                + 'oauth_version="' + parameters.oauth_version + '"',
                header = {
                    Authorization: header_oauth
                };

                _xhr(method, url, null, header, callback);
            },

            refresh_token: function(){
                //refresh token
            },

            xhr: function( oauth, parameters, method, url, data, headers, callback ){
                parameters = parameters || {};
                parameters.oauth_consumer_key       = oauth.consumer_key;
                parameters.oauth_nonce              = this.generate_nonce();
                parameters.oauth_signature_method   = oauth.signature_method;
                parameters.oauth_timestamp          = Math.round(+_state.date / 1000);
                parameters.oauth_token              = oauth.oauth_token;
                parameters.oauth_version            = oauth.version || "1.0";
                parameters.oauth_signature          = oauthSignature.generate(method, url, parameters, oauth.consumer_secret, oauth.oauth_token_secret);

                headers = headers || {};
                headers['Authorization'] = 'OAuth oauth_consumer_key="' + parameters.oauth_consumer_key + '",'
                + 'oauth_nonce="' + parameters.oauth_nonce + '",'
                + 'oauth_signature="' + parameters.oauth_signature + '",'
                + 'oauth_signature_method="' + parameters.oauth_signature_method + '",'
                + 'oauth_timestamp="' + parameters.oauth_timestamp + '",'
                + 'oauth_token="' + parameters.oauth_token + '",'
                + 'oauth_version="' + parameters.oauth_version + '"';

                _xhr(method, url, data, headers, callback);
            }
        },

        oauth2: {
            authenticate: function( module, callback ){
                var that = this;
                if( _modules[ module ].oauth.access_token !== null && _modules[ module ].oauth.refresh_token !== null){
                    this.refresh_token( _modules[ module ], function( response ){
                        if(response.state === 0){
                            callback({state: 0, error: response.error});
                        }

                        var response_data = JSON.parse( response.r );

                        _modules[ module ].oauth.access_token   = response_data.access_token;
                        _modules[ module ].oauth.token_type     = response_data.token_type;
                        _modules[ module ].oauth.expires_in     = response_data.expires_in;
                        _modules[ module ].oauth.refresh_token  = response_data.refresh_token;
                    } );
                } else {
                    this.authorize( _modules[ module ].oauth.authorize_uri, _modules[ module ].oauth.response_type, _modules[ module ].oauth.client_id, _modules[ module ].oauth.redirect_uri, _modules[ module ].oauth.scope, _modules[ module ].oauth.authorize_options, function(response){
                        if(response.state === 0){
                            callback({state: 0, error: response.error});
                            return;
                        }

                        var authorization_code = decodeURIComponent( response.r.url ).match( _modules[ module ].oauth.reg_authorization_code );

                        //if is an desktop app, some api give you token without code
                        if(authorization_code && authorization_code[0] && authorization_code[0].indexOf('access_token=') != -1){
                            _modules[ module ].oauth.access_token   = authorization_code[1];
                            _modules[ module ].oauth.expires_in     = authorization_code[2];
                            _modules[ module ].login                = true;

                            callback({state: 1, error: null});

                            return;
                        }

                        if(authorization_code.indexOf('Error') != -1){
                            callback({state:0, error: authorization_code});
                        } else {
                            that.access_token( _modules[ module ].oauth.access_token_uri, authorization_code[1], _modules[ module ].oauth.redirect_uri, callback);
                        }
                    } );
                }
            },

            authorize: function( uri, response_type, client_id, redirect_uri, scope, options, callback){
                var url = "https://" + uri + "?" +
                "response_type=" + response_type + "&" +
                "client_id=" + client_id + "&" +
                "redirect_uri=" + redirect_uri + "&" +
                "scope=" + scope;

                for(var option in options){
                    url += "&" + option + "=" + options[ option ];
                }

                _window_open( url, callback );
            },

            access_token: function( uri, grant_type, code, redirect_uri, client_id, callback ){
                var url = "https://" + uri;

                _xhr( "GET", url, {
                    grant_type: grant_type,
                    code: code,
                    redirect_uri: redirect_uri,
                    client_id: client_id
                }, null, callback );
            },

            refresh_token: function(){
                
            },

            xhr: function( oauth, parameters, method, url, data, headers, callback ){
                headers = headers || {};
                headers['Authorization'] = "Bearer " + oauth.access_token;

                _xhr( method, url, data, headers, callback );
            }
        },

        getAccessAndRefreshToken: function(module, authorizationCode, callback) {
            _xhr( module.accessTokenMethod, module.accessTokenURL, module.accessTokenParams( authorizationCode ), null, function(r){
                r = module.parseAccessToken(r.r);

                module.access_token = r.access_token;
                module.refresh_token = r.refresh_token;
                module.expiresIn = r.expiresIn;
                module.login = true;

                callback({state: 1, error: null});
            });
        },

        refreshToken: function( module, callback ){
            _xhr( module.refreshTokenMethod, module.refreshTokenUrl, module.refreshTokenParams(), null, function(r){
                r = module.parseRefreshToken(r.r);

                module.access_token = r.access_token;
                module.expiresIn = r.expiresIn;
                module.login = true;

                callback({state: 1, error: null});
            });
        }
    },

    social = {
        init: function(module, settings){
            module = module || {};

            for(var x in module){
                this.addModule(x, module[x]);
            }

            if(settings){
                apply_settings( settings );
            }
        },

        addModule: function( name, clientID, module ){
            if(!(module || this.isModuleLoaded( name ))){
                loadModule( name );
                temp_client_id[name] = clientID;

                return;
            }

            var implementing = [
                'accessToken', 'accessTokenDate', 'apiScope', 'clientId', 'clientSecret',
                'expiresIn', 'refreshToken', 'redirect_uri', 'accessTokenURL', 'accessTokenMethod',
                'parseAuthorizationCode', 'accessTokenParams', 'parseAccessToken', 'api'
            ];

            implementing.forEach(function(method, index) {
                if (!method in module) {
                    throw 'Invalid module! Missing method: ' + method;
                }
            });

            _modules[ name ] = module;
            _data[ name ] = _data[ name ] || {};

            if(clientID){
                _modules[ name ].oauth.client_id = clientID;
            } else if(temp_client_id[name]) {
                _modules[ name ].oauth.client_id = temp_client_id[name];

                delete temp_client_id[name];
            }

            //improve script interface
            codingImprovement( name );

            if(!listeners.hasOwnProperty(name)){
                return;
            }

            if(listeners[name].hasOwnProperty('retrieving')){
                listeners[name]['retrieving']();
            }

            if(listeners[name].hasOwnProperty('loaded')){
                listeners[name]['loaded']();
            }
        },

        getModule: function( name ){
            return module['name'] || {};
        },

        isModuleLoaded: function( name ){
            return in_array(name, _state.module_loaded);
        },

        getModulesLoaded: function(){
          return _state.module_loaded;
        },

        updateSettings: function( key, value ){
            if(_settings.hasOwnProperty( key ) && _settings[key] !== value){
                _settings[ key ] = value;

                _state.last_time_changed = _state.date.getTime();
            }
        },

        updateData: function( api, key, value ){
            if(_data.hasOwnProperty( api ) && (!_data[ api ].hasOwnProperty( key ) || (_data[ api ][ key ] !== value))){
                _data[ api ][ key ] = value;

                _state.last_time_changed = _state.date.getTime();
            }
        },

        disableCaching: function(){
            if(_settings.caching){
                this.updateSettings( 'caching', false );
                clearInterval( _settings.timer_caching );

                cache.clear();
            }
        },

        isCachingEnabled: function(){
            return _settings.caching;
        },

        enableCaching: function(){
            if(!_settings.caching){
                this.updateSettings( 'caching', true );
                _settings.timer_caching = setInterval(function(){
                    cache.update();
                }, _settings.interval_caching);
            }
        },

        isCryptCachingEnabled: function(){
            return _settings.crypt_caching;
        },

        enableCryptCaching: function(password){
            this.updateSettings( 'crypt_caching', true );
            this.updateSettings( 'crypt_password', password );

            cache.update();
        },

        disableCryptCaching: function(){
            this.updateSettings( 'crypt_caching', false );
            this.updateSettings( 'crypt_password', null );

            cache.update();
        },

        //popup authentication api
        windowResponse: function(response){
            _window_response = response;
        },

        disconnect: function( module ){
            if(_modules.hasOwnProperty( module )){
                delete _modules[ module ];
            }
        },

        login: function( module, scope, callback ){
            if(!this.isModuleLoaded( module )){
                throw 'This module is not loaded';
            }

            if(typeof scope == 'function'){
                callback = scope;
                scope = null;
            }

            if(!callback || typeof callback != 'function'){
                callback = function(e){};
            }

            if(this.isLogged( module )){
                callback({state: 1, error: null});
                return;
            }

            _modules[ module ].login = false;

            switch(_modules[ module ].oauth.version){
                case '2.0':
                    _oauth.oauth2.authenticate( module, callback);
                    break;
                case '1.0':
                    _oauth.oauth1.authenticate( module, callback);
                    break;
                default:
                    throw "This Oauth version doesn't exists";
                    break;
            }
        },

        logout: function( module, callback ){
            _modules[ module ].login = false;

            //logout action if exists
            disconnect( module );
        },

        isLogged: function( module ){
            return (_modules[ module ].hasOwnProperty('login') && _modules[ module ].login === true);
        },

        cache: {
            set: function(api, key, data){
                if(!_data.hasOwnProperty(api)){
                    return;
                }

                _data[api][key] = data;
            },

            get: function(api, key){
                if(!_data.hasOwnProperty(api) || !_data[api].hasOwnProperty(key)){
                    return;
                }

                return _data[api][key];
            }
        },

        on: function(ev, callback){
            var data = ev.split('.'),

            module = data[0],

            ev = data[1];

            if(!ev){
                module = null;
                ev = data[0];
            }

            if(ev === 'retrieving'){
                throw 'This event is forbidden';
            }

            if(typeof callback !== 'function'){
                throw 'The callback function is invalid';
            }

            trigger(module, ev, callback);
        },

        //the first argument is api and the last is callback
        api: function(){
            var api_split = arguments[0].split('.'),

            module = api_split[0],

            api = api_split[1],

            callback, p;

            if(typeof arguments[ arguments.length - 1] != 'function'){
                arguments[ arguments.length] = function(e){};
                arguments.length += 1;
            }

            if(!_modules[module].api.hasOwnProperty(api) && typeof _modules[module].api[api] != 'function'){
                throw 'This api does not exist for this module';
            }

            if(!this.isLogged( module )){
                throw 'You must be log in';
            }

            var args = Array.prototype.slice.call(arguments);
                args.shift();
                args.pop();

            callback = arguments[ arguments.length - 1];

            p = _modules[module].api[api].apply(_modules[module].api, args);
            p.url = _mergeData2Url(p.url, p.data_merge)
                .replace('{{a}}', _modules[ module ].oauth.access_token)
                .replace(encodeURI('{{a}}'), _modules[ module ].oauth.access_token);

            var fn = function(r){
                _data[module][api] = r.r;

                r.r = JSON.parse(r.r);

                if(p.hasOwnProperty('parser') && _modules[module].parser.hasOwnProperty(p.parser)){
                    r.r = _modules[module].parser[p.parser](r.r);
                }

                callback(r);
            };

            _oauth[ (_modules[ module ].oauth.version == '2.0') ? 'oauth2' : 'oauth1' ].xhr( _modules[ module ].oauth, p.data_merge, p.method, p.url, null, null, fn);
        }
    };

    (function self(){
        //retrieve previous session configuration and data if exist
        if(!cache.hasCache()){
            return;
        }

        var d = cache.get();

        apply_settings( d.settings );

        _data = d.data;

        for(var module in d.modules){
            (function(name, data){
                trigger( name, 'retrieving', function(){
                    _modules[ name ].oauth.access_token = data.access_token;
                    _modules[ name ].oauth.refresh_token = data.refresh_token;
                    _modules[ name ].oauth.expires_in = data.expires_in;
            }); }(module, d.modules[module]));
        }
    }());

    window.social = social;
}( window ));