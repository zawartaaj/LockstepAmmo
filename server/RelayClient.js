
"use strict";

/*

    See:

        https://www.npmjs.com/package/ws#how-to-detect-and-close-broken-connections

    for WebSocket module docs

    TODO:

*/


(class RelayClient extends Serializable {
    initPrototype () {
        this.newSlot("server", null);
        this.newSlot("connection", null);
        this.newSlot("channelsSet", null);  // string or number
    }

    init () {
        this.setChannelsSet(new Set())
        this.makeVendByReference()
    }

    relayMessage (rm) {
        return this.connection().sendProxyRemoteMessage(rm) // returns DOFuture
    }

    onChannelDidAddClient (aClient) {
        this.connection().proxy().onChannelDidAddClient(aClient).ignoreResponse()
    }

    onChannelDidRemoveClient (aClient) {
        this.connection().proxy().onChannelDidRemoveClient(aClient).ignoreResponse()
    }

    // --- receive remote message ----

    onRemoteMessage_self () {
        return this
    }
    
    onRemoteMessage_addSubscription (channelName) {
        Type.assertIsString(channelName)
        const channel = this.server().channelNamedCreateIfAbsent(channelName)
        this.channelsSet().add(channel)
        channel.addClient(this)
        return [channel, channel.clientsSet()] // we return both in order to ensure it has client set before getting msgs from other clients in the channel
    }

    onRemoteMessage_asyncRemoveSubscription (channelName) {
        Type.assertIsString(channelName)
        const channel = this.server().channelNamedCreateIfAbsent(channelName)
        channel.removeClient(this)
        this.channelsSet().delete(channel)
        channel.removeClient(this)
    }

    onRemoteMessage_asyncReceiveMessage (rm) {
        //console.log(this.typeId() + " onRemoteMessage_asyncReceiveMessage(" + rm.description() + ")")
        this.connection().sendProxyRemoteMessage(rm).ignoreResponse()
    }

    // --- remote connection delegate methods ---

    onDOConnectionDidOpen () {
    }

    onDOConnectionDidClose () {
        this.unsubscribeAll()
        this.server().onRelayClientClose(this)
    }

    unsubscribeAll () {
        this.channelsSet().forEach(channel => {
            channel.removeClient(this)
        })
    }

}.initThisClass());
