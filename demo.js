// Create a server to demo/mockup the session management API
var http = require('http'),
    sys = require('sys'),
    Sessions = require('./Sessions');

    
var SessionManager = new Sessions.manager({
    lifetime: 1
});

SessionManager.addListener("create", function(sid){
    sys.puts("Created Session "+sid);
});
    
SessionManager.addListener("change", function(data){
    sys.puts(data);
});

SessionManager.addListener("destroy", function(sid){
    sys.puts("Destroyed Session "+sid);
});


http.createServer(function(req, resp) {
    
    var session = new Sessions.create(SessionManager);
    
    var ret = "<p> Hi there, here is your browsing history: </p><ul>";
    ret += "</ul><p> Here are some other fascinating pages you can visit on our lovely site: </p><ul><li><a href=foo>foo</a><li><a href=bar>bar</a><li><a href=quux>quux</a></ul>";

    resp.sendHeader(200, {
        'Content-Type': 'text/html',
        'Set-Cookie': session.getHeader()
    });
    
    resp.sendBody(ret);
    resp.finish();
    
}).listen("8008", "localhost");
