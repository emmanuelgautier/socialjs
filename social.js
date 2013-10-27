(function( window ){
    "use strict";

    var _modules = {},

    _state = {
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

	auth_url = null,

    in_array = function(s, arr){
        for(var i = 0, m = arr.length; i < m; i += 1){
            if(s === arr[i]){
                return 1;
            }
        }

        return 0;
    },

    _mergeData2Url  = function( url, data ){
        var params = '?';
        for (var key in data) if(data.hasOwnProperty(key)){
            params += encodeURIComponent(key) + '=' +
            encodeURIComponent(data[key]) + '&';
        }
        url += params;

        return url;
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

        _state.last_time_changed = (new Date).getTime();
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

            window.social[name].login = function( fn ){ window.social.login( name, fn); };

        for(var api in _modules[ name ].api){
            window.social[ name ][ api ] = (function(name, api){ return function(data, fn) { window.social.api( name + '.' + api, data, fn ); }; })(name, api);
        }
    },

    cache = {
        cacheobject: {
            crypt: false,
            data: null
        },

        clear: function(){
            delete localStorage.social;
        },

        crypt: function( str ){
            return str;
        },

        decrypt: function( str ){
            return str;
        },

        hasCache: function(){
            return localStorage.hasOwnProperty( 'social' );
        },

        store: function( data ){
            if(_settings.crypt_caching){
                data = cache.crypt( data );
                this.cacheobject.crypt = true;
            } else {
                this.cacheobject.crypt = false;
            }

            this.cacheobject.data = data;

            localStorage.social = JSON.stringify( this.cacheobject );
        },

        get: function(){
            if(!this.hasCache()){
                return;
            }

            var d = JSON.parse( localStorage.social );

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
                    config_module[x].client_id = _modules[x].client_id;
                    config_module[x].access_token = _modules[x].access_token;
                    config_module[x].refresh_token = _modules[x].refresh_token;
                    config_module[x].expireIn = _modules[x].expireIn;
                }

                var d = {
                    'settings': _settings,
                    'data': _data,
                    'modules': config_module
                };

                this.store( d );

                _state.last_time_caching = (new Date).getTime();
            }

            if(listeners.hasOwnProperty('saved')){
                listeners.saved();
            }
        }
    },

    oauth = {
        authorize: function(module, scope, callback){
            var url = module.authorizationCodeURL(scope, _settings.default_redirect_uri),

            authorizationCode,

            popup = window.open(
                url,
                'Authentication',
                "resizeable=true,height=550,width=500,left="+ ((window.innerWidth - 500) / 2) + ",top=" + ((window.innerHeight - 550) / 2)
            );

            popup.focus();

            var that = this,
            timer = setInterval(function(){
                if(popup.closed){
                    clearInterval(timer);
                    callback({state:0, error: "The authentication window has been closed"});
                }

                if(auth_url){
                    authorizationCode = module.parseAuthorizationCode(auth_url);
                    auth_url = null;

                    popup.close();
                    clearInterval(timer); 

                    //if is an desktop app, some api give you token without code
                    if(authorizationCode.access_token){
                        module.access_token     = authorizationCode.access_token;
                        module.refresh_token    = authorizationCode.resfresh_token;
                        module.expiresIn        = authorizationCode.expiresIn;
                        module.login            = true;

                        callback({state: 1, error: null});

                        return;
                    }

                    if(authorizationCode.indexOf('Error') != -1){
                        callback({state:0, error: authorizationCode});
                    } else {
                        module.access_token = authorizationCode;
                        that.getAccessAndRefreshToken(module, authorizationCode, callback);
                    }
                }
            }, 100);
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
            _data[ name ] = _data[ name ] | {};

            if(clientID){
                _modules[ name ].client_id = clientID;
            } else if(temp_client_id[name]) {
                _modules[ name ].client_id = temp_client_id[name];

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

                _state.last_time_changed = (new Date).getTime();
            }
        },

        updateData: function( api, key, value ){
            if(_data.hasOwnProperty( api ) && (!_data[ api ].hasOwnProperty( key ) || (_data[ api ][ key ] !== value))){
                _data[ api ][ key ] = value;

                _state.last_time_changed = (new Date).getTime();
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
        setAuthUrl: function( url ){
            auth_url = url;
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

            if(_modules[ module ].accessToken !== null && _modules[ module ].refresh_token !== null){
                oauth.refreshToken( _modules[ module ], callback );
            } else {
                oauth.authorize( _modules[ module ], scope, callback );
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

        api: function(api, data, _callback){
            var api_split = api.split('.'),

            module = api_split[0],

            api = api_split[1],

            p;

            if(!_modules[module].api.hasOwnProperty(api) && typeof _modules[module].api[api] != 'function'){
                throw 'This api does not exist for this module';
            }

            if(_modules[module].access_token === null){
                throw 'You must be log in';
            }

            if(typeof data == 'function'){
                _callback = data;
                data = null;
            }

            data = data || {};

            p = _modules[module].api[api](data);
            p.url = _mergeData2Url(p.url, p.data_merge).replace('{{a}}', _modules[ module ].access_token);
            
            var fn = function(r){
                _data[module][api] = r.r;

                r.r = JSON.parse(r.r);

                if(p.hasOwnProperty('parser') && _modules[module].parser.hasOwnProperty(p.parser)){
                    r.r = _modules[module].parser[p.parser](r.r);
                }

                _callback(r);
            };

            _xhr( p.method, p.url, null, {'Authorization': "Bearer " + _modules[ module ].access_token}, fn );
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
                    _modules[ name ].access_token = data.access_token;
                    _modules[ name ].refresh_token = data.refresh_token;
                    _modules[ name ].expiresIn = data.expiresIn;
            }); }(module, d.modules[module]));
        }
    }());

    window.social = social;
}( window ));