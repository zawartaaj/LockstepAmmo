"use strict";

(class DORef extends Serializable {

    initPrototype () {
        this.newSerializableSlot("remoteId", null) // shared set of strings
    }

    setRemoteId (id) {
        if (id.startsWith("DistantObject")) {
            throw new Error("attempt to set remote id to a DistantObject")
        }
        this._remoteId = id
        return this
    }

    didUnserialize (refResolver) {
        const id = this.remoteId()
        assert(id)

        if (refResolver) {
            if (refResolver.hasVendedObjectForId(id)) {
                // it's a local object whose ref is coming back to us
                const localObject = refResolver.vendedObjectForId(id)
                if (localObject) {
                    return localObject
                }
            }

            const distantObject = refResolver.distantObjectForId(id)
            if (distantObject) {
                return distantObject.proxy()
            }

            throw new Error("unable to find distant or local object for remote id: " + id)
        }

        return this
    }

}.initThisClass());

