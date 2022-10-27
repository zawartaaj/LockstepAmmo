"use strict";


(class ActionGroup extends Serializable {
    initPrototype () { 
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

}.initThisClass());

