//---------------------------------------
//	Enhancing the HTTP Lib for cookies.  
//---------------------------------------

// summary:
// 	- Adds getCookie method to the httpRequest object.
// 	- Adds setCookie and clearCookie methods to the httpResponse object.
// acknowledgements:
// 	Code based on http://github.com/jed/cookie-node/blob/master/cookie-node.js


var http = require( "http" ),
    sys = require( "sys" );

function pad(len, str, padder){
	var padder = padder || "0";
	while(str.length < len){
		str = padder + str;
	}
	return str;
}

process.mixin(http.IncomingMessage.prototype, {
	// summary:
	// 	The getCookie method.
	_parseCookies: function() {
		var ret = {}, cookies;
		
		if (this.headers.cookie && (cookies = this.headers.cookie.split(";"))){
			
			for(var parts, cookieName, cookie; cookies.length && (cookie = cookies.shift());){
				parts = cookie.split("=");
				
				cookieName = (""+parts[0]).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
				
				ret[cookieName] = (""+parts[1]).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
			}
		}
			
		return this.cookies = ret;
	},
	
	getCookie: function(name){
		var cookies = this._parseCookies();
		
		return cookies[name] || null;
	}
});

process.mixin(http.ServerResponse.prototype, {
	// summary:
	// 	The getCookie method.
	setCookie: function( name, value, options ) {
		var cookie = name+"="+value+";";
		
		this.cookies = this.cookies || [];
		
		options = options || {};
		
		if ( options.expires ){
			var d = new Date(this.expires);
			var wdy = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
			var mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
					
			cookie += ('expires=' + wdy[d.getUTCDay()] + ', ' + pad(2, d.getUTCDate()) + '-' + mon[d.getUTCMonth()] + '-' + d.getUTCFullYear() + ' ' + pad(2, d.getUTCHours()) + ':' + pad(2, d.getUTCMinutes()) + ':' + pad(2, d.getUTCSeconds()) + ' GMT');
		}
		if ( options.path ){
			cookie += " path="+options.path+";";
		}
		if ( options.domain ){
			cookie += " domain="+options.domain+";";
		}
      if ( options.secure ){
      	cookie += "; secure";
		}
		if ( options.httpOnly ){
      	cookie += "; httpOnly";
		}
		this.cookies.push(cookie);
	},
	
	clearCookie: function( name, options ) {
		options.expires = new Date( +new Date - 30 * 24 * 60 * 60 * 1000 );
		this.setCookie( name, "", options );
	}
});

// this probably isn't kosher, but it's the best way to keep the interface sane.
var _sendHeader = http.ServerResponse.prototype.sendHeader;
http.ServerResponse.prototype.sendHeader = function ( statusCode, headers ) {
	if(this.cookies){
		headers["Set-Cookie"] = this.cookies.join(", ");
	}
  _sendHeader.call( this, statusCode, headers );
};
