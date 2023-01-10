
"use strict";

/*
    
    RelayChannel

    A channel clients connect to to relay messages to the group.
    Possible uses:
    - a chat room
    - a multi-player game
    - a multi-user simulation

*/

(class RelayChannel extends Serializable {
    initPrototype () {
        this.newSlot("server", null);
        this.newSlot("name", null);
        this.newSlot("clientsSet", null);
    }

    init () {
        this.setClientsSet(new Set())
        this.makeVendByReference()
    }

    addClient (aClient) {
        const cs = this.clientsSet()
        if (!cs.has(aClient)) {
            cs.forEach(client => client.onChannelDidAddClient(aClient))
            cs.add(aClient)
        }
    }

    removeClient (aClient) {
        const cs = this.clientsSet()
        if (cs.has(aClient)) {
            cs.delete(aClient)
            cs.forEach(client => client.onChannelDidRemoveClient(aClient))
        }
    }

    // --- receive remote message ----

    onRemoteMessage_clientsSet (sender) {
        return this.clientsSet()
    }

    /*
    onRemoteMessage_broadcastMessage (rm) {
        Type.assertIsInstanceOf(rm, RemoteMessage)
        this.clientsSet().forEach(client => {
            client.relayMessage(rm).ignoreResponse()
        })
    }
    */

    onRemoteMessage_asyncRelayMessageFrom (rm, aClient) {
        Type.assertIsInstanceOf(rm, RemoteMessage)
        //let count = 0
        this.clientsSet().forEach(client => {
            if (client !== aClient) {
                //console.log("onRemoteMessage_asyncRelayMessageFrom(" + rm.description() + ", " + aClient.uuid() + ")")
                client.relayMessage(rm).ignoreResponse()
                //count++
            }
        })
        //return count // return number of clients the message was relayed to
    }


}.initThisClass());
