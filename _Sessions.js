(function(){
	
	var sys = require('sys'), puts = sys.puts;
	
	var sessions = {},
	    cleanupTimer;
	
	var lookupOrCreate = function(req, opts) {
		var session,
		    opts = opts || {},
		    id = idFromRequest(req, opts); // find or generate a session ID
		
		if(id && sessions[id]) {
			session = sessions[id];
			session.expiration = (+new Date) + session.lifetime * 1000;
			
			return sessions[id] = session;
		} else {
			return createSession(req, opts);
		}
	};
	
	var createSession = function(options){
		session = new Session(generateId(), options);
		session.expiration = (+new Date) + session.lifetime*1000;
		
		puts((+new Date)+"\tCreated Session: \t"+session.id+"\tEnds At: "+session.expiration);
		
		if(!cleanupTimer){
			cleanupTimer = setTimeout(cleanup, session.lifetime*1000);
		}
		
		return sessions[session.id] = session;
	};
	
	
	function idFromRequest(req, opts) {
		var m;
		if (req.headers.cookie && (m = /SID=([^ ,;]*)/.exec(req.headers.cookie)) ){
			return m[1];
		}
		
		return false;
	};


	function generateId() {
		var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', // base64 alphabet
			 ret = '';
		
		for (var bits=24; bits > 0; --bits){
			ret += chars[0x3F & (Math.floor(Math.random() * 0x100000000))];
		}
	
		return ret
	};
	
	function cleanup() {
		var now = (+new Date),
			 next = Infinity;
				
		for(var id in sessions){
			if(Object.prototype.hasOwnProperty.call(sessions, id)){
				var session = sessions[id];
				if(session.expiration < now){
					puts(now+"\tEnded Session:\t\t"+id);
					session.destroy();
				} else {
					next = (next < session.expiration ? next : session.expiration-now);
				}
			}
		}
		if(next < Infinity){
			cleanupTimer = setTimeout(cleanup, next);
		}
	};
	
	var Session = function(/*String*/ sid, /*Hash*/ options){
		// Summary:
		// 	Creates a new session, based on the id and options supplied.
		// sid:
		// 	The session identifier.
		// options:
		// 	domain:
		// 		If present, the cookie (and hence the session) will apply to
		// 		the given domain, which may include other subdomains.
		//
		// 		For example, on a request from foo.example.org, if the domain
		// 		is set to '.example.org', then this session will persist across 
		// 		any subdomain of example.org.
		// 		
		//			By default, the domain is not set, and the session will only be 
		// 		visible to other requests that exactly match the domain.
		//
		// 	path:
		// 		If set, the session will be restricted to URLs underneath the 
		// 		given path.
		// 		
		// 		By default the path is "/", which means that the same sessions 
		// 		will be shared across the entire domain.
		//
		// 	lifetime:
		// 		If you wish to create a persistent session (one that will last 
		// 		after the user closes the window and visits the site again) you 
		// 		must specify a lifetime as a number of seconds.
		//
		// 		Common values are 86400 for one day, and 604800 for one week.
		//
		// 		The lifetime controls both when the browser's cookie will expire, 
		// 		and when the session object will be freed by the sessions module.
		// 		
		// 		By default, the browser cookie will expire when the window is 
		// 		closed, and the session object will be freed 24 hours after the 
		// 		last request is seen.
		this.id = sid;
		this.domain = options.domain;
		this.path = options.path || '/'; // Defaults to the root of the domain.
	
		// if the caller provides an explicit lifetime, then we use a persistent cookie
		// it will expire on both the client and the server lifetime seconds after the last use
		// otherwise, the cookie will exist on the browser until the user closes the window or tab,
		// and on the server for 24 hours after the last use
		if (options.lifetime) {
			this.persistent = 'persistent' in options ? options.persistent : true;
			this.lifetime = options.lifetime;
		} else {
			this.persistent = true;
			this.lifetime = 5;
		}
	
		this._data = {};
		
		process.EventEmitter.call(this);
	};
	sys.inherits(Session, process.EventEmitter);

	
	Session.prototype.set = function(key, value){
		this._data[key] = value;
		this.emit("change", this._data);
	};
	
	Session.prototype.get = function(key){
		if(key){
			return key in this._data ? this._data[key] : undefined;
		}
		return this._data;
	};

	Session.prototype.destroy = function(){
		// summary:
		// 	Removes the current session.
		this.emit("destroy", sessions[this.id]);
		delete sessions[this.id];
	};
	
	Session.prototype.toString = function(){
		// summary:
		// 	Generates the HTTP header for the current session.
		var parts = ['SID=' + this.id];
		if(this.path){
			parts.push('path=' + this.path)
		}
		if(this.domain){
			parts.push('domain=' + this.domain)
		}
		if(this.persistent){
			function pad(n) {
				return n > 9 ? '' + n : '0' + n
			}

			var d, wdy, mon
			d = new Date(this.expiration);
			wdy = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
			mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

			parts.push('expires=' + wdy[d.getUTCDay()] + ', ' + pad(d.getUTCDate()) + '-' + mon[d.getUTCMonth()] + '-' + d.getUTCFullYear() + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + ' GMT')
		}
		
		return parts.join('; ');
	};
	
	exports.lookupOrCreate = lookupOrCreate;
	exports.create = createSession;
	
})();
