// Create a server to demo/mockup the session management API
var http = require('http'),
    puts = require("sys").puts,
    sessions = require('./Sessions'),
    port = 8080,
    hostname = "" // listen on all addresses

session = sessions.create({domain: ""});

session.addListener("destroy", function(session){
    puts("Session Ended "+session.id);
});
    
session.addListener("change", function(data){
    putJSON(data);
});


http.createServer(requestHandler).listen(port, hostname)

function putJSON(data){
    puts(JSON.stringify(data));
}

// handle incoming requests
function requestHandler(req, resp) {
    var session, body, options, sessionID
    
    session = sessions.lookupOrCreate(req);
    
    
    
    // The returned session object has the following properties:
    // .data, which is an (initially empty) object that you use to store your session data
    // .id, which is the session's ID (read-only)
    // .setCookieHeader(), which gives the value for the setCookieHeader which you have to set on the server response
    // we will use the session to store the visitor's browsing history
    
    tmp = session.get('history') || [];
    tmp.push(req.uri.path);
    
    putJSON(tmp);
    
    session.set('history', tmp);
    
    puts((+new Date)+"\tChanged Session:\t"+session.id+"\tEnds At: "+session.expiration);
    
    // we actually don't care about the URL the user requested, everything gets the same 'hello world' page.
    // but we store the pages the user visits in the session so we can show breadcrumbs on every page
    body = createHelloWorldPage(session.get('history'));

    // send the Set-Cookie header value with the response
    resp.sendHeader(200, {
        'Content-Type': 'text/html',
        'Set-Cookie': session
    });
    resp.sendBody(body);
    resp.finish();
}



function createHelloWorldPage(history) {
    ret = "<p> Hi there, here is your browsing history: </p><ul>";
    ret += JSON.stringify(history);
    ret += "</ul><p> Here are some other fascinating pages you can visit on our lovely site: </p><ul><li><a href=foo>foo</a><li><a href=bar>bar</a><li><a href=quux>quux</a></ul>";
    
    return ret;
}
