(function(){

	var sys = require("sys");
	
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
	
		this._sessionStore = {};
		
		process.EventEmitter.call(this);
	};

	sys.inherits(SessionManager, process.EventEmitter);

	SessionManager.prototype.createSession = function(){
		var _sid = this.generateId();
		var manager = this;
		
		var session = {
			sid: _sid,
			expires: Math.floor((+new Date) + this.lifetime*1000),
			getHeader: function(){
				var parts = ['SID=' + this.sid];
				if(manager.path){
					parts.push('path=' + manager.path);
				}
				if(manager.domain){
					parts.push('domain=' + manager.domain);
				}
				if(manager.persistent){
					function pad(n) {
						return n > 9 ? '' + n : '0' + n;
					}
					
					var d = new Date(this.expires);
					var wdy = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
					var mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
					
					parts.push('expires=' + wdy[d.getUTCDay()] + ', ' + pad(d.getUTCDate()) + '-' + mon[d.getUTCMonth()] + '-' + d.getUTCFullYear() + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + ' GMT');
				}
				return parts.join('; ');
			},
			data: function(key, value){
				if(value){
					this._data[key] = value;
					manager.emit("change", this.sid, this._data);
				}
				this.expires = Math.floor((+new Date) + manager.lifetime*1000);
				return this._data[key];
			},
			destroy: function(){
				manager.destroySession(this.sid);
			},
			_data: {}
		};
		
		this._sessionStore[_sid] = session;
		this.emit("create", _sid);
		
		sys.log("\033[0;32m+++ "+_sid+"\tExpires: "+timestamp(session.expires));
		
		if(!this.timer){
			this.cleanup();
		}
				
		return this._sessionStore[_sid];
	};
	
	SessionManager.prototype.lookupSession = function(sid){
		return this._sessionStore[sid] || null;
	};
	
	SessionManager.prototype.lookupOrCreate = function(req){
		var sid;
		
		if (req.headers.cookie && (sid = (/SID=([^ ,;]*)/.exec(req.headers.cookie))[1]) && this._sessionStore[sid]){
			sys.log(">>> Retrieved Session. "+sid);
			this._sessionStore[sid].expires = Math.floor((+new Date) + this.lifetime*1000);
			return this._sessionStore[sid];
		} else {
			return this.createSession();
		}
	};
	
	SessionManager.prototype.destroySession = function(sid){
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
					this.destroySession(sid);
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
	
	exports.manager = SessionManager;
})();
