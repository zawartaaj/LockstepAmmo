"use strict";

/*

    RemoteMessage

    Abstraction for message send which is useful for transparently sending a message over a network.

    NOTES

    - on serialization, arguments are serialized to a string so they will not be unserialized by 
      an intermediary (which may not contain the classes which the arguments are instances of), 
      such as a server that is relaying the message

      We wait until the message is sent to unserialize the arguments.

    - creationProxy() method can be used to construct a message

*/

(class RemoteMessage extends Serializable {

    static creationProxy () {
        const handler = {
            get (target, methodName) {
                return (...args) => { 
                    const rm = RemoteMessage.fromNameAndArgs(methodName, args)
                    return rm
                };
            }
        }
    
        return new Proxy({}, handler)
    }

    static fromNameAndArgs (methodName, args) {
        const rm = RemoteMessage.clone()
        rm.setMethodName(methodName)
        rm.setArgs(args)
        return rm
    }

    initPrototype () {
        this.newSerializableSlot("messageId", null)
        this.newSerializableSlot("targetId", null)
        this.newSerializableSlot("timestamp", null)
        this.newSerializableSlot("methodName", null)
        this.newSlot("args", null) // json array 
        this.newSerializableSlot("sargs", null) // string for serialized args
        this.newSerializableSlot("senderId", null) // optional
        this.newSlot("refResolver", null) 
    }

    init () {
        super.init()
        this.setArgs(null) // use null to say they haven't been set. We use this for sargs handling.
        this.setTimestamp(Date.now()) // milliseconds since 1970
        this.setMessageId(this.newUuid())
    }

    // --- asJson / fromJson overrides to support args serialization ---

    serializeArgs (loopCheck, refCreator) {
        const json = Object.valueAsJson(this.args(), loopCheck, refCreator)
        const s = JSON.stringify(json)
        this.setSargs(s)
    }

    unserializeArgs () {
        if (this.sargs()) {
            const s = this.sargs()
            /*
            assert(s !== "null")
            assert(s !== null)
            */
            const json = JSON.parse(s)
            const args = Object.valueFromJson(json, this.refResolver())
            /*
            if (this.methodName() === "addActionGroup") {
                assert(args.length !== 0)
            }
            */
            this.setArgs(args)
            //this.setSargs(null)
        }
    }

    asJson (loopCheck = new Set(), refCreator) {
        if (this.sargs() === null) { 
            // RemoteMessage being relayed may be re-serialized on server
            // in which case the args are already serialized
            this.serializeArgs(loopCheck, refCreator)
        }

        /*
        if (this.methodName() === "addActionGroup") {
            assert(this.sargs().length !== 0)
            //console.log("VALID addActionGroup asJson:", JSON.stringify(json, 2, 2))
            //debugger;
        }
        */

        var json = super.asJson(loopCheck, refCreator)
        
        /*
        assert(json.slots._sargs !== "null")
        assert(json.slots._sargs !== null)
        */

        return json
    }

    fromJson (json, refResolver) {
        this.setRefResolver(refResolver) // need to keep this around for unserializeArgs
        return super.fromJson(json, refResolver)
    }
    
    // ---

    expectsResponse () {
        return !this.methodName().startsWith("async")
    }

    safeMethodName () {
        return "onRemoteMessage_" + this.methodName()
    }

    sendTo (target) {
        this.unserializeArgs()


        if (target.distantObjectForProxy) { 
            // it's a distant target
            const distObj = target.distantObjectForProxy()
            return distObj.handleMessageToProxy(this)
        } else {
            // it's a local target
            const m = this.safeMethodName() // the "safe" method name is only used when method is actually applied
            const f = target[m]
            const args = this.args()
            if (f) { 
                // the method is available
                //this.debugLog(" RECEIVE " + target.type() + "." + m + "(" + args.map(a => JSON.stringify(a, 2, 2)).join(",") + ")")
                return f.apply(target, args)
            } else {
                // the method is missing
                const targetType = target ? target.type() : target
                const msg = this.type() + " ERROR " + targetType + "." + m + "() method missing, targetId: " + this.targetId()
                console.log(msg)
                throw new Error(msg)
            }
        }
        return undefined
    }

    targetName () {
        const tid = this.targetId()
        return tid ? tid : "<conn root>"
    }

    argsDescription () {
        if (this.sargs()) {
            return Type.describe(this.sargs())
        }
        return this.args().map(arg => Type.describe(arg)).join(", ")
    }

    description () {
        return this.targetName() + "." + this.methodName() + "(" + this.argsDescription() + ")"
    }

    shortDescription () {
        const a = this.args().length ? "..." : "";
        return this.targetName() + "." + this.methodName() + "(" + a + ")";
    }

}.initThisClass());
