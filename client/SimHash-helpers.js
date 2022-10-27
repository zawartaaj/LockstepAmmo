"use strict";

/*

    Quick and dirty 32bit sanity check hashes to verify sims are synchronized

    WARNING: sortedSerializablePrivateSlotNames assumes serializableSlotsSet doesn't change
    after initPrototype(). Maybe we should freeze() the serializeableSlotNames?

    TODO: might need to optimize this, depending on how often we want to do sync checks

*/

// --- Uint32Array - this is the core hash function

Object.defineSlot(Uint32Array.prototype, "simHash",
    function (loopCheck = new Set()) {
        let hash = 0
        this.forEach(v => {
            hash = (hash << 5) - hash + v;
            hash &= hash; // Convert to 32bit integer
        })
        return new Uint32Array([hash])[0]
    }
);

// --- String ---

Object.defineSlot(String.prototype, "asUint32Array",
    function () {
        // NOTE: Unicode chars can take up to 4 bytes (32bits)
        const letters = new Uint32Array(this.length)
        for (let i = 0; i < this.length; i++) {
            letters[i] = this.charCodeAt(i)
        }
        return letters
    }
);

Object.defineSlot(String.prototype, "simHash",
    function () {
        return this.asUint32Array().simHash()
    }
);

// --- Object class simHashCodeForValue() method ---

const primitiveHashMap = new Map();
primitiveHashMap.set("undefined", "undefined".toString().simHash());
primitiveHashMap.set("null", "null".toString().simHash());
primitiveHashMap.set("false", "false".toString().simHash());
primitiveHashMap.set("true", "true".toString().simHash());

Object.defineSlot(Object, "simHashCodeForValue",
    function (v, loopCheck = new Set()) {
        if (v === undefined) return primitiveHashMap.get("undefined");
        if (v === null) return primitiveHashMap.get("null");
        if (v === false) return primitiveHashMap.get("false"); 
        if (v === true) return primitiveHashMap.get("true");
        assert(v.simHash) 
        assert(!loopCheck.has(this))
        loopCheck.add(v)
        const result = v.simHash(loopCheck, loopCheck)
        loopCheck.delete(v)
        return result
    }
);

// --- Number ---

Object.defineSlot(Number.prototype, "simHash",
    function (loopCheck = new Set()) {
        return this.toString().simHash();
    }
);

// --- Set ---

Object.defineSlot(Set.prototype, "simHash",
    function (loopCheck = new Set()) {
        const hashes = this.map(v => Object.simHashCodeForValue(v, loopCheck))
        hashes.sort() // since sets are not ordered, we need to order values to make sure same sets will match
        return hashes.simHash()
    }
);

// --- Map ---

Object.defineSlot(Map.prototype, "simHash",
    function (loopCheck = new Set()) {
        const hashes = []
        this.forEach((v, k) => {
            const h = [k.simHash(), Object.simHashCodeForValue(v, loopCheck)].simHash()
            hashes.push(h)
        })
        hashes.sort() // since maps are not ordered, we need to order values to make sure same sets will match
        return hashes.simHash()
    }
);

// --- Array ---

Object.defineSlot(Array.prototype, "simHash",
    function (loopCheck = new Set()) {
        const hashes = this.map(v => Object.simHashCodeForValue(v, loopCheck))
        return Uint32Array.from(hashes).simHash()
    }
);

// --- Serializable ---

Object.defineSlot(Serializable.prototype, "simHash",
    function (loopCheck = new Set()) {
        const hashes = this.sortedSerializablePrivateSlotNames().map(privateName => {
            //const v = this[privateName]
            const getterName = privateName.slice(1)
            const v = this[getterName].call(this)
            return Object.simHashCodeForValue(v, loopCheck)
        })
        return hashes.simHash()
    }
);

Object.defineSlot(Serializable.prototype, "sortedSerializablePrivateSlotNames",
    function () {
        if (!this._sortedSerializablePrivateSlotNames) {
            const privateSlotNames = Array.from(this.serializableSlotNamesSet()).map(k => "_" + k)
            privateSlotNames.sort()
            this._sortedSerializablePrivateSlotNames = privateSlotNames
        }
        return this._sortedSerializablePrivateSlotNames
    }
);