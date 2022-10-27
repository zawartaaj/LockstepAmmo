
"use strict";

/*
    RelayServer

    A simple WebSocket server. Basic idea is dumb server and smart clients.
    Server just informs clients of one another and relays messages between them (which includes client channels).

    When a client connects:
    - the server assigns it a unqiue id via a setRootId message
    - and server adds the client to it's client list

    When a client is added:
    - the server shares the current list of clients with the new client
    - the server informs all other clients of the new client

*/

(class RelayServer extends DOServer {

    initPrototype () {
        this.newSlot("clientsSet", null);
        this.newSlot("channelsMap", null); // channelName -> channel
    }

    init () {
        super.init()
        this.setClientsSet(new Set())
        this.setChannelsMap(new Map())
    }

    onConnection (conn) {
        super.onConnection(conn)

        const client = RelayClient.clone()
        client.setServer(this)
        client.setConnection(conn)
        conn.setRootObject(client)
        this.addClient(client)
        return this;
    }

    addClient (aClient) { // private
        this.clientsSet().add(aClient);
        return this
    }

    removeClient (aClient) {
        console.log('RelayServer removeClient()');
        this.clientsSet().delete(aClient);
        return this;
    }

    onRelayClientClose (aClient) {
        this.removeClient(aClient);
    }

    // --- these are sent by RelayClient objects --- 

    channelNamedCreateIfAbsent (channelName) {
        const map = this.channelsMap()
        if (!map.has(channelName)) {
            const channel = RelayChannel.clone()
            channel.setServer(this)
            channel.setName(channelName)
            map.set(channelName, channel)
        }
        return map.get(channelName)
    }

    onConnectionClose (aConnection) { // sent by DOConnection to us as it's delegate
        this.debugLog(".onConnectionClose()")
        super.onConnectionClose(aConnection)
    }

}.initThisClass());