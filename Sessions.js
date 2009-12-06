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
	
	function pad(value, len) {
		var len = len || 2;
		var value = new String(value);

		if(value.length < len){
			while(value.length < len){
				value = "0"+value;
			}
		}
		return value;
	}
	
	function timestamp(time){
		var time = time ? new Date(time) : new Date;
		return pad(time.getUTCDate())+"/"+pad(time.getMonth())+"/"+time.getFullYear()+" "+pad(time.getHours())+":"+pad(time.getMinutes())+":"+pad(time.getSeconds())+":"+pad(time.getMilliseconds(), 4);
	}
	
	sys.log = function(){
		sys.puts("\033[0;37m"+timestamp()+"\033[0m\t"+Array.prototype.join.call(arguments, " ")+"\033[0m ");
	};
	
	function size(obj){
		var len = 0;
		for(var x in obj){
			if(Object.hasOwnProperty.call(obj, x)){
				++len;
			}
		}
		return len;
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
			expires: Math.floor((+new Date) + this.lifetime*1000),
			data: {}
		};
		
		this._sessionStore[_sid] = session;
		this.emit("create", _sid);
		
		sys.log("\033[0;32m+++ "+_sid+"\tExpires: "+timestamp(session.expires));
		
		if(!this.timer){
			this.cleanup();
		}
				
		return this._sessionStore[_sid];
	};
	
	
	
	SessionManager.prototype.changeSession = function(sid, data){
		this._sessionStore[sid].data = data;
		this._sessionStore[sid].expires = Math.floor((+new Date) + this.lifetime*1000);
		this.emit("change", sid, data);
	};
	
	SessionManager.prototype.deleteSession = function(sid){
		this.emit("destroy", sid);
		//delete this._sessionStore[sid];
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
			 now = Date.now(),
			 next = Infinity;
		
		sys.log(">>> Cleaning Up.");
		sys.puts(sys.inspect(this._sessionStore));
		sys.log("\033[0;33m=== Sessions:"+ size(this._sessionStore));
		
		for(var sid in this._sessionStore){
			if(Object.prototype.hasOwnProperty.call(this._sessionStore, sid)){
				
				sessionExpiration = this._sessionStore[sid].expires;
				
				sys.log(">>> Checking: "+sid+": "+(sessionExpiration-now));
				
				// Using a Max Difference because timers can be delayed by a few milliseconds.
				if(sessionExpiration - now < 100){
					sys.log("\033[0;31m--- "+sid);
					delete this._sessionStore[sid];
				} else {
					next = next > sessionExpiration ? sessionExpiration : next;
				}
			}
		}
		
		sys.log("\033[0;33m=== Sessions:"+ size(this._sessionStore));
		
		if(next < Infinity && next >= 0){
			sys.log(">>> Next Cleanup at: "+timestamp(next));
			
			var self = this;
			this.timer = setTimeout(function(){
				self.cleanup.apply(self, []);
			}, next-now);
			
		} else {
			delete this.timer;
			sys.log(">>> No More Cleanups. ");
			sys.puts(sys.inspect(this._sessionStore));
		}
	};
	
	var defaultSessionManager = new SessionManager();
	
	var Session = function(manager){
		this.manager = manager || defaultSessionManager;
		this.session = this.manager.createSession.apply(this.manager, []);
	};

	Session.prototype.destroy = function(){};
	Session.prototype.lookup = function(req){};
	Session.prototype.lookupOrCreate = function(req){};
	
	Session.prototype.getHeader = function(key){
		var key = key || "SID";
		
		var parts = [key+'=' + this.session.sid];
		
		if(this.manager.path){
			parts.push('path=' + this.manager.path)
		}
		if(this.manager.domain){
			parts.push('domain=' + this.manager.domain)
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
