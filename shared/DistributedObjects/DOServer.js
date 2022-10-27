
"use strict";

/*
    DOServer

*/

const WebSocket = require('ws');

(class DOServer extends WsServer {

    initPrototype () {
        this.newSlot("rootObject", null);
    }

    init () {
        super.init()
    }

    newConnectionForWebSocket (webSocket) {
        const conn = DOConnection.clone()
        conn.setWebSocket(webSocket)
        conn.setupWebSocket()
        conn.setDelegate(this)
        conn.setRootObject(this.rootObject())
        return conn
    }

}.initThisClass());