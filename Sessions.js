(function(){
	var sys = require("sys"),
	    cookies = require("./http-cookie");
	
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
		
		this.domain          = options.domain || '';
		this.path            = options.path || '/';
		this.persistent      = options.persistent || true;
		this.lifetime        = options.lifetime || 86400;
		this.secure          = options.secure || false;
		this.httpOnly        = options.httpOnly || false;
		this._sessionStore = {};
		
		process.EventEmitter.call(this);
	};

	sys.inherits(SessionManager, process.EventEmitter);

	SessionManager.prototype.create = function(resp){
		var _sid = this._sid();
		var manager = this;
		
		var session = {
			sid: _sid,
			expires: Math.floor((+new Date) + this.lifetime*1000),
			data: function(key, value){
				if(value){
					manager.setData(this.sid, key, value);
				}
				
				if(key){
					return manager.getData(this.sid, key);
				} else {
					return manager.getData(this.sid);
				}
			},
			destroy: function(resp){
				resp.clearCookie("SID");
				manager.destroy(this.sid);
			},
			_data: {}
		};
		
		this._sessionStore[_sid] = session;
		this.emit("create", _sid);
		
		resp.setCookie("SID", _sid, {
			domain: this.domain,
			path: this.path,
			expires: session.expires,
			secure: this.secure,
			httpOnly: this.httpOnly
		});
		
		sys.log("\033[0;32m+++ "+_sid+"\tExpires: "+timestamp(session.expires));
		
		if(!this.timer){
			this.cleanup();
		}
				
		return this._sessionStore[_sid];
	};
	
	SessionManager.prototype.lookup = function(req){
		var sid = req.getCookie("SID");
		
		if(this._sessionStore[sid]){
			sys.log(">>> Retrieved Session. "+sid);
			
			this._sessionStore[sid].expires = Math.floor((+new Date) + this.lifetime*1000);
			return this._sessionStore[sid];
		} else {
			return null;
		}
	};
	
	SessionManager.prototype.lookupOrCreate = function(req, resp){
		var session = this.lookup(req);
		return session ? session : this.create(resp);
	};
	
	SessionManager.prototype.has = function(req){
		return this.lookup(req) ? true : false;
	};
	
	
	SessionManager.prototype.get = function(sid){
		return this._sessionStore[sid];
	};
	
	SessionManager.prototype.destroy = function(sid){
		this.emit("destroy", sid);
		delete this._sessionStore[sid];
	};
	
	
	SessionManager.prototype.getData = function(sid, key){
		var session = this.get(sid);
		session.expires = Math.floor((+new Date) + this.lifetime*1000);
		if(key){
			return session._data[key] ? session._data[key] : null;
		} else {
			return session._data;
		}
	};
	
	SessionManager.prototype.setData = function(sid, key, value){
		sys.log(">>> Set Data: "+sid+"[\033[0;32m"+key+"\033[0;0m] = "+JSON.stringify(value));
		
		var session = this._sessionStore[sid];
		session._data[key] = value;
		session.expires = Math.floor((+new Date) + this.lifetime*1000);
		
		this.emit("change", sid, session._data);
		return session._data[key];
	};
	
	
	SessionManager.prototype._sid = function(){
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
					this.destroy(sid);
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
	
	SessionManager.prototype.serialize = function(){
		sys.debug("SessionManager.serialize is unstable.");
		return JSON.stringify(this._sessionStore);
	};
	SessionManager.prototype.deserialize = function(string){
		sys.debug("SessionManager.deserialize is unstable.");
		this._sessionStore = JSON.parse(string);
	};
	
	exports.manager = SessionManager;
})();
