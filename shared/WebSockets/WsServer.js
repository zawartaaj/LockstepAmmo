
"use strict";

/*
    WsServer


*/

// ---------

const WebSocket = require('ws');
require("../Base/getGlobalThis.js");
require("../Base/Base.js");
require("../WebSockets/WsConnection.js");

(class WsServer extends Base {

    initPrototype () {
        this.newSlot("port", 443);
        this.newSlot("webSocketServer", null);
        this.newSlot("connections", null);
        this.newSlot("isSecure", false);
        //this.newSlot("connectionClass", WsConnection);
    }

    init () {
        super.init()
        this.setConnections(new Set())
    }

    options () {
        if (this.isSecure()) {
            return { 
                server: this.secureHttpServer()
            }
        }

        return {
            port: this.port()
        }
    }

    secureHttpServer () {
        const fs = require('fs');

        const privateKey = fs.readFileSync(__dirname + '/keys/key.pem', 'utf8');
        const certificate = fs.readFileSync(__dirname + '/keys/cert.pem', 'utf8');

        const credentials = { key: privateKey, cert: certificate };
        const https = require('https');

        const httpsServer = https.createServer(credentials);
        httpsServer.listen(this.port());

        const options = { 
            port: this.port(), 
            server: httpsServer 
        }
        return httpsServer
    }

    start () {
        const webSocketServer = new WebSocket.Server(this.options())
        this.setWebSocketServer(webSocketServer);

        webSocketServer.on("connection", (webSocket, request) => {
            webSocket._ipAddress = this.ipAddressForRequest(request)
            this.onWsConnection(webSocket);
        })

        console.log("RelayServer listening for WebSocket connections on port " + this.port());
    }

    ipAddressForRequest (request) {
        const forward = request.headers["x-forwarded-for"]
        if (forward) {
            // When the server runs behind a proxy like NGINX, 
            // the de-facto standard is to use the X-Forwarded-For header.
            return forward.split(',')[0].trim();
        }
        return request.socket.remoteAddress
    }

    newConnectionForWebSocket (webSocket) {
        const conn = WsConnection.clone()
        conn.setWebSocket(webSocket)
        conn.setupWebSocket()
        conn.setDelegate(this)
        conn.setRootObject(this.rootObject())
    }

    onWsConnection (webSocket) {
        this.debugLog(".onConnection()");
        const conn = this.newConnectionForWebSocket(webSocket)
        this.connections().add(conn)
        this.onConnection(conn)
        return this;
    }

    onConnection (conn) {
        // for subclasses to override
    }

    onConnectionClose (aConnection) { // sent by DOConnection to us as it's delegate
        this.debugLog(".onConnectionClose()")
        this.connections().delete(aConnection)
    }

}.initThisClass());

// -------------------



