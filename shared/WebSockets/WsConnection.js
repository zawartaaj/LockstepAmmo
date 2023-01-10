"use strict";

/*

    WsConnection

    Manages basic WebSocket connection and related events

    Notes

    - some weirdness here due to node.js and browser versions of WebSocket API being slightly different
      such as: conventions on registering for events, checking WebSocket state, etc

*/

(class WsConnection extends Base {

    initPrototype () {
        this.newSlot("webSocket", null)
        this.newSlot("error", null)

        this.newSlot("serverHost", "localhost")  // only used for opening client sidec connection
        this.newSlot("serverPort", 9000) // only used for opening client sidec connection

        /*
        this.newSlot("messageCount", 0) // to generate unique request id's
        this.newSlot("pingPeriod", 30 * 1000); // milliseconds
        this.newSlot("sendPingTimeout", null); // timeout to send next ping
        this.newSlot("pongTimeout", null); // timeout to stop waiting for pong and close
        */
        this.newSlot("delegate", null)
        this.newSlot("isSecure", false)
    }

    init () {
        super.init()
        this.setIsDebugging(true)
    }

       // --- websocket ---

    url () {
        const scheme = this.isSecure() ? "wss" : "ws"
        const url = scheme + "://" + this.serverHost() + ":" + this.serverPort() + "/"
        return url
    }

    connectToServer () {
        const url = this.url()
        this.debugLog("connecting to: " + url)
        const ws = new WebSocket(url);
        this.setWebSocket(ws)
        this.setupWebSocket()
        return this
    }

    setupWebSocket () {
        if (this.isInBrowser()) {
            this.browser_setupWebSocket()
        } else {
            this.node_setupWebSocket()
        }
        return this
    }

    browser_setupWebSocket () {
        //this.resetPingTimeout()
        const ws = this.webSocket()
        assert(!ws._connection)
        ws._connection = this

        ws.onclose = (event) => {
            //event.wasClean
            this.onClose(event.code, event.reason);
        }

        ws.onerror = (event) => {
            this.onError(event);
        }

        ws.onmessage = (event) => {
            this.onMessage(event.data);
        }

        ws.onopen = (event) => {
            this.onOpen();
        }

        ws.onping = (event) => {
            this.onPing(); 
        }

        return this
    }

    node_setupWebSocket () {
        const ws = this.webSocket()
        if (ws) {
            ws.on('close', (code, reason) => {
                this.onClose(code, reason)
            });

            ws.on('error', (data) => {
                this.onError(data);
            });

            ws.on('message', (data) => {
                this.onMessage(data);
            });

            ws.on('pong', (data) => {
                this.onPong(data);
            });
        }
        //this.onOpen()
        //this.sendPing()
    }

    shutdown () {
        this.debugLog(" shutdown")
        //this.clearTimeouts()

        const ws = this.webSocket()

        if (this.isInBrowser()) {
            ws.close()
        } else {
            ws.terminate()
        }

        this.rootObject().onDOConnectionDidClose(this)
    }

    isOpen () {
        const ws = this.webSocket()
        return ws && ws.isOpen()
    }

    // --- websocket events API ---

    onOpen () {
        this.debugLog(" onOpen()")
    }

    /*
    onConnect () {
        this.debugLog(" onConnect()")
    }
    */

    onClose (code, reason) {
        // code 1006 can mean INVALID CERT 
        if (code === 1006) {
            console.log(this.type() + " onClose() ERROR: INVALID CERT")
        }
        this.debugLog(" onClose(code: " + code + ", reason:" + reason + ")")
        if (this.delegate()) {
            this.delegate().onConnectionClose(this)
        }

        this.shutdown(this);
    }

    onError (event) {
        // event appears to be of type "Event", not ErrorEvent, so it has no message - odd!
        this.debugLog(" onError(event) ", event)
        this.setError(event.message)
        this.shutdown()
    }

    onMessage (data) {
        //this.debugLog(" onMessage(" + data.toString() + ")");
    }

    // --- keep alive ping/pong timeouts ---

    /*

    // server side 

    clearTimeouts () {
        this.clearSendPingTimeout()
        this.clearPongTimeout()
    }

    clearSendPingTimeout () {
        if (this.sendPingTimeout()) {
            clearTimeout(this.sendPingTimeout())
            this.setSendPingTimeout(null) 
        }
    }

    clearPongTimeout () {
        if (this.pongTimeout()) {
            clearTimeout(this.pongTimeout())
            this.setPongTimeout(null) 
        }
    }

    onPong () {
        this.clearPongTimeout()
        const timeout = setTimeout(() => { 
            this.sendPing() 
        }, this.pingPeriod()) // setup timer to send next ping
        this.setSendPingTimeout(timeout)
    }

    sendPing () {
        this.debugLog(" " + this.clientId() + " sendPing")
        this.webSocket().ping() // pong should be automatically returned
        const timeout = setTimeout(() => { this.onPongTimeout() }, this.pingPeriod())
        this.setPongTimeout(timeout)
    }

    onPongTimeout () {
        this.debugLog(" onPongTimeout")
        // our last ping to the client didn't return a pong in the pong timeout period
        this.shutdown()
    }
    */


    /*

    // client side

    clearPingTimeout () {
        if (this.pingTimeout()) {
            clearTimeout(this.pingTimeout());
        }
    }

    resetPingTimeout () {
        this.clearPingTimeout()

        // Delay should be equal to the interval at which your server
        // sends out pings plus a conservative assumption of the latency.
        const dt = this.serverPingInterval() * 1.1
        const timeout = setTimeout(() => this.onTimeout(), dt);
        this.setPingTimeout(timeout)
        return this
    }

    onTimeout () {
        console.log("onTimeout")
        this.close()
    }

    */

}.initThisClass());



