"use strict";

(class DOErrorResponse extends Serializable {

    initPrototype () {
        this.newSerializableSlot("messageId", null)
        this.newSerializableSlot("error", null)
    }

    description () {
        return this.type() + " >>>>>>>>>> REMOTE ERROR:" + this.error()
    }

}.initThisClass());
