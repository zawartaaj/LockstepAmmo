"use strict";

/*

    DOConnection

    Manages WebSocket connection

    - supports proxy to easily send a remote message just like a local message
    - methos name and arguments are auto serialized on this side, and deserialized on other side
    
    Notes

    - some weirdness here due to node.js and browser versions of WebSocket API being slightly different
      such as: conventions on registering for events, checking WebSocket state, etc

*/

(class DOConnection extends WsConnection {

    initPrototype () {
        this.newSlot("rootObject", null) // this is target for proxy messages and the delegate for onOpen, onClose, and onError
        this.newSlot("remoteTargetId", null)
        this.newSlot("proxy", null)
        this.newSlot("distantObjectsMap", null)
        this.newSlot("vendedObjectsMap", null)
        this.newSlot("futuresMap", null)
    }

    init () {
        super.init()
        this.setDistantObjectsMap(new Map()) // uuid -> DistantObject
        this.setVendedObjectsMap(new Map()) // uuid -> LocalObject
        this.setFuturesMap(new Map())
        this.setProxy(this.newProxy())
        this.setIsDebugging(false)
    }

    // --- websocket events API ---

    onOpen () {
        super.onOpen()
        this.rootObject().onDOConnectionDidOpen(this)
    }

    /*
    onConnect () {
        super.onConnect()
    }

    onClose (code, reason) {
        super.onClose(code, reason)
    }

    onError (event) {
        super.onError(event)
    }
    */

    // --- resolving remote references ---

    /*
    hasDistantObjectForId (id) {
        return this.distantObjectsMap().has(id)
    }
    */

    distantRootObject () {
        return this.distantObjectForId("rootObject")
    }

    distantObjectForId (id) {
        assert(id)

        const obj = this.distantObjectsMap().get(id)
        if (obj) {
            return obj
        }
        
        const newObj = DistantObject.clone().setConnection(this).setRemoteId(id)
        this.distantObjectsMap().set(id, newObj)
        return newObj
    }

    refForLocalObject (obj) {
        assert(!obj.distantObjectForProxy) // proxy should already be unwrapped!
        
        if (obj.type() === "DistantObject") {
            //const distantObject = obj.distantObjectForProxy()
            //return DORef.clone().setRemoteId(distantObject.remoteId())
            return DORef.clone().setRemoteId(obj.remoteId())
        }

        const id = obj.uuid()
        const vended = this.vendedObjectsMap()
        if (!vended.has(id)) {
            vended.set(id, obj)
            // chance to hook this
        }

        return DORef.clone().setRemoteId(id)
    }

    hasVendedObjectForId (id) {
        return this.vendedObjectsMap().has(id)
    }

    vendedObjectForId (id) { // TODO: better name?
        if (!id || id === "rootObject") {
            return this.rootObject()
        }
        
        const distantObject = this.vendedObjectsMap().get(id)

        if (!distantObject) {
            throw new Error("no vendedObject for targetId: '" + id + "'")
        }
        return distantObject
    }

    // --------------------------------------

    onMessage (data) {
        const json = JSON.parse(data.toString())

        if (json.type === "DOResultResponse" || json.type === "DOErrorResponse") {
            this.onResponseJson(json)
        }  else if (json.type === "RemoteMessage") {
            this.onRemoteMessageJson(json)
        } else {
            throw new Error(this.type() + " onMessage() called with invalid type: " + json.type)
        }
    }

    onResponseJson (json) {
        let response = null

        try {
            response = Object.valueFromJson(json, this)
        } catch (e) {
            console.warn(this.type() + " EXCEPTION >>>>>>>>>>>>>>> " + e);
            debugger;
        }

        this.debugLog(" GOT REPLY " + response.messageId() + "  " + response.description());
        const mid = response.messageId()

        const futures = this.futuresMap()
        if (futures.has(mid)) { // future may not be available if it's timed out
            const future = futures.get(mid)
            futures.delete(mid)
            future.handleResponse(response)
        } else {
            console.warn(this.type() + " MISSING FUTURE for " + mid + " (may have timed out) response callback will not be called")
            debugger;
        }
    }

    onRemoteMessageJson (json) {
        let rm = undefined
        let target = undefined
        try {
            rm = Object.valueFromJson(json, this)
            //this.debugLog(" RECEIVED " + this.rootObject().type() + "." + rm.shortDescription());
            this.debugLog(" RECEIVED " + this.rootObject().type() + "." + rm.description());
            /*
            if (rm.methodName() === "requestStateFor") {
                debugger;
            }
            */
            target = this.vendedObjectForId(rm.targetId()) 
            const result = rm.sendTo(target)
            if (rm.expectsResponse()) {
                const response = DOResultResponse.clone().setMessageId(rm.messageId())
                response.setResult(result)
                this.debugLog(" REPLIED " + rm.description() + " -> " + response.description());
                this.sendResponse(response)
            } else {
                assert(result === undefined)
            }
        } catch (e) {
            console.warn("DOConnection onRemoteMessageJson() EXCEPTION >>>>>>>>>>>>>>>>> ", e)
            debugger;
            if (rm) {
                const response = DOErrorResponse.clone().setMessageId(rm.messageId())
                response.setError(e.message)
                let msg = target ? target.typeId() : "<target?>"
                msg += "." + rm.methodName() + "()"
                this.debugLog(" REPLIED " + msg + " -> " + response.description());
                this.sendResponse(response)
            }
        }
    }

    sendResponse (response) {
        const json = response.asJson(new Set(), this)
        const s = JSON.stringify(json)
        this.rawSend(s)
    }

    // --- proxy ---

    newProxy () {
        return this.distantObjectForId("rootObject").proxy()
    }

    assertOpen () {
        const ws = this.webSocket()
        if (!ws) {
            throw new Error(this.type() + " LOCAL ERROR: no webSocket");
        }

        if (!ws.isOpen()) {
            throw new Error(this.type() + " LOCAL ERROR: webSocket is closed");
        }
    }

    sendProxyRemoteMessage (rm) {
        const future = this.newFutureForMessage(rm)
        try {
            const json = rm.asJson(new Set(), this)
            const s = JSON.stringify(json)
            this.debugLog(" SEND " + rm.description());
            this.rawSend(s)
            assert(future)
        } catch (e) {
            console.log("ERROR: ", e)
            future.setError(e.message)
        }
        return future
    }

    rawSend (s) {
        this.assertOpen()
        this.webSocket().send(s)
    }

    newFutureForMessage (rm) {
        const future = DOFuture.clone()
        future.setConnection(this)
        future.setMessage(rm)
        this.futuresMap().set(rm.messageId(), future)
        assert(this.futuresMap().has(rm.messageId()))
        return future
    }

    removeFuture (aFuture) {
        this.futuresMap().delete(aFuture.message().messageId())
    }

    // --- serialization ---

    serializedValue (aValue) {
        const json = aValue.asJson(new Set(), this)
        const aString = JSON.stringify(json)
        return aString
    }

    unserializedValue (aString) {
        const json = JSON.parse(aString)
        return this.unserializeJson(json)
    }

    unserializeJson (json) {
        const value = Object.valueFromJson(json, new Set(), this)
        return value
    }

    // --- testing ---

    static selfTest () {
        const con = DOConnection.clone()
        con.proxy().foo(1, 2, "three")
    }

}.initThisClass());



