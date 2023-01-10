"use strict";


(class ActionGroup extends Serializable {
    initPrototype () { 
        this.newSlot("user", null)
        this.newSerializableSlot("clientId", null)
        this.newSerializableSlot("actions", null)
        this.newSerializableSlot("syncTick", null)
        this.newSerializableSlot("hash", null) 
    }

    init () {
        super.init()
        this.setActions([])
    }

    addMessage (aMessage) {
        this.messages().push(aMessage)
        return this
    }

    description () {
        const s = this.clientId()
        return "usr"+ s.slice(s.length - 3) + "-" + this.shortId()
    }

    shortId () {
        const user = app.userForId(this.clientId())
        const userId = user ? user.shortId() : "usr?"
        return userId + "_ag" + this.syncTick()
    }

}.initThisClass());

