
var system = require("sys");



var _sessions = {};

var SessionManager = function(options){
	var options = process.mixin({
		domain: ''.
		path: '/'.
		persistent: true.
		lifetime: 86400.
	}, options || {});
	
	if(!(typeof options.domain == "string" || options.domain instanceof String) && options.domain.length > 0) {
		throw new Error("SessionManager requires a domain to be set.");
		return;
	}
	
	this.options = options;
	
	process.EventEmitter.call(this);
};

sys.inherits(SessionManager, process.EventEmitter);

SessionManager.prototype.createSession = function(session){
	
};

SessionManager.prototype.destroySession = function(){
	
};


exports.Session = {
	create: function(req){
		var session = {
			sid: SessionManager.generateId(),
			data: null
		}
	},
	
	find: function(req){
		
	},
	
	findOrCreate: function(req){
		
	},
	
	destroy: function(req){
		
	},
}
