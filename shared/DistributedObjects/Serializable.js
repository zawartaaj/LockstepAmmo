"use strict";

(class Serializable extends Base {

    static isSerializable () {
        return true // this is tricky - we don't want to serialize classes (yet)
    }

    isSerializable () {
        return this.constructor.isSerializable()
    }

    newSerializableSlot (name, value) {  
        // this should only be called on a prototype
        // this isn't ideal, but don't want to add slot abstraction for small demo
        this.newSlot(name, value)
        this.setupSlotSet()
        this.serializableSlotNamesSet().add(name)
        return this
    }

    setupSlotSet () {
        if (!Object.hasOwnProperty(this, "serializableSlotNamesSet")) {
            const oldSet = this._serializableSlotNamesSet
            const newSet = oldSet ? new Set(oldSet) : new Set();
            this.setSerializableSlotNamesSet(newSet)
        }
    }

    initPrototype () {
        this.newSlot("serializableSlotNamesSet", null) // shared set of strings
        this.newSlot("vendType", "copy") // ["copy", "reference"]
    }

    // --- vending ---

    doesVendByCopy () {
        return this.vendType() === "copy"
    }

    doesVendByReference () {
        return this.vendType() === "reference"
    }

    makeVendByReference () {
        this.setVendType("reference")
        return this
    }

    // ----

    init () {
        super.init()
    }

    // --- as json ---

    /*
    asString () {
        return JSON.stringify(this.asJson())
    }
    */

    asJson (loopCheck = new Set(), refCreator) {

        if (this.doesVendByReference()) {
            assert(refCreator)
            const ref = refCreator.refForLocalObject(this)
            return ref.asJson(loopCheck, refCreator)
        }

        const json = {}

        /*
        if (this.doesVendByReference()) {
            json.type = "DistantRef"
            json.uuid = this.uuid()
            return json
        }
        */

        json.type = this.type()
        json.slots = this.jsonSlotsDict(loopCheck, refCreator)
        return json
    }

    jsonSlotsDict (loopCheck, refCreator) {
        const dict = {}
        const slotNames = this.serializableSlotNamesSet()
        slotNames.forEach(slotName => {
            const privateName = "_" + slotName
            if (Reflect.has(this, privateName)) {
                const value = this[privateName]
                dict[privateName] = Object.valueAsJson(value, loopCheck, refCreator)
            } else {
                throw new Error(this.type() + " missing slot " + privateName)
            }
        })
        return dict
    }

    // --- from json ---

    fromJson (json, refResolver) {
        const dict = json.slots
        assert(dict)
        this.serializableSlotNamesSet().forEach(slotName => {
            const privateName = "_" + slotName
            if (Reflect.has(dict, privateName)) {
                const value = dict[privateName]
                this[privateName] = Object.valueFromJson(value, refResolver)
            } else {
                // ignore?
            }
        })
        return this.didUnserialize(refResolver)
    }

    didUnserialize (refResolver) {
        return this
    }

    // --- copying ---

    copySerializableSlotsFrom (obj) {
        this.serializableSlotNamesSet().forEach(slotName => {
            this.copySerializableSlotFrom(slotName, obj)
        })
    }

    copySerializableSlotFrom (slotName, obj) {
        const privateName = "_" + slotName
        assert(Reflect.has(this, privateName)) 
        assert(Reflect.has(obj, privateName)) 
        const oldValue = this[privateName]
        const newValue = obj[privateName]
        this[privateName] = newValue

        /*
        const newType = typeof(newValue)
        if (newType === "string" || newType === "number") {
            this[privateName] = newValue
        }
        */
        /*
        if (Reflect.has(newValue, "copySerializableSlotsFrom")) {
            assert(Reflect.has(oldValue, "copySerializableSlotsFrom"))
            oldValue.copySerializableSlotsFrom(newValue)
        } else {
            this[privateName] = newValue
        }
        */

    }

}.initThisClass());

