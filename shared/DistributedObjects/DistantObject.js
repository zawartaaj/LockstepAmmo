"use strict";

/*

    DistantObject

    Manages proxy to a vended object across a DOConnection

*/

(class DistantObject extends Base {

    initPrototype () {
        this.newSlot("connection", null) // this is target for proxy messages and the delegate for onOpen, onClose, and onError
        this.newSlot("remoteId", null) 
        this.newSlot("proxy", null)
        this.newSlot("localCache", null)
    }

    init () {
        super.init()
        this.setProxy(this.newProxy())
        this.setLocalCache(new Map())
    }

    description () {
        return this.type() + "->" + this.remoteId()
    }

    // --- proxy ---

    newProxy () {
        const self = this
        const handler = {
            get (target, methodName) {
                return (...args) => {

                    if (methodName === "description") {
                        return "Proxy->" + target.description()
                    }

                    if (methodName === "distantObjectForProxy") {
                        return target
                    }

                    if (methodName === "doesVendByReference") {
                        return true
                    }
                    /*
                    if (methodName === "localCacheForProxy") {
                        return this.localCache()
                    }
                    */

                    const rm = RemoteMessage.fromNameAndArgs(methodName, args)
                    return self.handleMessageToProxy(rm) 
                };
            }
        }
    
        return new Proxy(this, handler)
    }

    handleMessageToProxy (rm) {
        if (rm.methodName() === "connectionToProxy") {
            return self.connection()
        }
        rm.setTargetId(this.remoteId())
        return this.connection().sendProxyRemoteMessage(rm)
    }

    /*
    handleMessageFromProxy (rm) {

    }
    */

}.initThisClass());



