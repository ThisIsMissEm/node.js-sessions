(function(){

	var sys = require("sys");

	var debug = function(src, deep, indent){
		
		indent += "\t";
		
		for(var key in src){
			sys.puts(indent+key+": "+src[key]);
			if(src[key].toString() == "[object Object]" && deep){
				debug(src[key], deep, indent);
			}
    	}
	}
	
	// The Session Manager:

	var SessionManager = function(options){
		var options = options || {};
		
		this.domain				= options.domain		|| '';
		this.path				= options.path 		|| '/';
		this.persistent		= options.persistent || true;
		this.lifetime			= options.lifetime 	|| 86400;
	
		this._cleaner = null;
		this._sessionStore = {};
		
		process.EventEmitter.call(this);
	};

	sys.inherits(SessionManager, process.EventEmitter);

	SessionManager.prototype.createSession = function(){
		var _sid = this.generateId();
		var session = {
			sid: _sid,
			expires: (+new Date) + this.lifetime*1000,
			data: {}
		};
	
		
		this._sessionStore[_sid] = session;
		
		this.emit("create", _sid);
		
		debug(this._sessionStore, true, "");
		
		if(this._cleaner === null){
			this.cleanup();
		}
		
		return this._sessionStore[_sid];
	};

	SessionManager.prototype.changeSession = function(sid, data){
		this._sessionStore[sid].data = data;
		this._sessionStore[sid].expires = (+new Date) + this.lifetime*1000;
	
		this.emit("change", sid, data);
	};
	
	SessionManager.prototype.deleteSession = function(sid){
		this.emit("destroy", sid);
		
		delete this._sessionStore[sid];
	};
	
	SessionManager.prototype.generateId = function(){
		var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', // base64 alphabet
			 ret = '';
	
		for (var bits=24; bits > 0; --bits){
			ret += chars[0x3F & (Math.floor(Math.random() * 0x100000000))];
		}
		return ret;
	};
	
	SessionManager.prototype.cleanup = function(){
		var sessionExpiration,
			 now = (+new Date),
			 next = Infinity;
		
		sys.puts(now + "\tCleanup Running.");
		
		for(var sid in this._sessionStore){
			if(Object.prototype.hasOwnProperty.call(this._sessionStore, sid)){
		
				sessionExpiration = this._sessionStore[sid].expires;
				if(sessionExpiration < now){
					this.deleteSession(sid);
				} else {
					next = sessionExpiration < next ? sessionExpiration-now : next;
				}
			}
		}
	
		if(next < Infinity){
			sys.puts("Cleanup Scheduled!");
			this._cleaner = setTimeout(this.cleanup, next);
		} else {
			sys.puts("No More Cleanups Needed!");
		}
		debug(this._sessionStore, true, "");
	};

	var Session = function(manager){
		this.session = manager.createSession();
		this.manager = manager;
	};

	Session.prototype.destroy = function(){};
	Session.prototype.lookup = function(req){};
	Session.prototype.lookupOrCreate = function(req){};
	
	Session.prototype.getHeader = function(){
		var parts = ['SID=' + this.session.sid];
		if(this.manager.path){
			parts.push('path=' + this.path)
		}
		if(this.manager.domain){
			parts.push('domain=' + this.domain)
		}
		if(this.manager.persistent){
			function pad(n) {
				return n > 9 ? '' + n : '0' + n
			}

			var d = new Date(this.manager._sessionStore[this.session.sid].expires);
			var wdy = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
			var mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

			parts.push('expires=' + wdy[d.getUTCDay()] + ', ' + pad(d.getUTCDate()) + '-' + mon[d.getUTCMonth()] + '-' + d.getUTCFullYear() + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + ' GMT')
		}
	
		return parts.join('; ');
	};


	exports.create = Session;
	exports.manager = SessionManager;

})();
