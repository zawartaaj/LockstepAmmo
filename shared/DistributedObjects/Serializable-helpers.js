"use strict";

/*
    Quick and dirty serialization.

    Loops:
    This does not support serializing loops, 
    but will detect them and throw an error.

*/

getGlobalThis().assert = function (v, errorMessage = "assertation failure") {
    if (!v) {
        throw new Error(errorMessage)
    }
}

// --- Object class fromJson ---

Object.defineSlot(Object, "valueAsJson",
    function (value, loopCheck = new Set(), refCreator) {
        
        if (value === null || value === undefined) {
            return null
        }

        const vType = typeof(value)
        if (vType === "string" || vType === "number" || vType === "boolean") {
            return value
        }

        if (loopCheck.has(value)) {
            throw new Error("serialization loop detected")
        }

        loopCheck.add(value)

        if (value.distantObjectForProxy) {
            assert(refCreator)
            const distantObject = value.distantObjectForProxy()
            value = refCreator.refForLocalObject(distantObject)
        }

        //assert(value.asJson, value.type() + " value has no asJson method to use for serialization")
        const result = value.asJson(loopCheck, refCreator)
        loopCheck.delete(value)
        return result
    }
);


Object.defineSlot(Object, "valueFromJson",
    function (json, refResolver) {

        if (json === null) {
            return null
        }

        if (typeof(json) === "string") {
            return json
        }

        if (typeof(json) === "number") {
            return json
        }

        if (json === undefined) {
            throw new Error("undefined is not a valid json value")
        }

        const className = json.type
        assert(className)

        const aClass = getGlobalThis()[className]
        assert(aClass, "missing class named '" + className + "'")
        assert(aClass.prototype.fromJson)

        let instance = undefined
        if (aClass.clone) {
            instance = aClass.clone()
        } else {
            instance = new aClass()
        }
        
        assert(instance.fromJson)
        return instance.fromJson(json, refResolver)
    }
);

// --- Array ---

Object.defineSlot(Array.prototype, "type",
    function () {
        return this.constructor.name
    }
);

Object.defineSlot(Array.prototype, "asJson",
    function (loopCheck = new Set(), refCreator) {
        const json = {}
        json.type = this.type()
        json.items = this.map(item => {
            return Object.valueAsJson(item, loopCheck, refCreator)
        })
        return json
    }
);

Object.defineSlot(Array.prototype, "fromJson",
    function (json, refResolver) {
        assert(this.type() === json.type)
        assert(json.items)
        json.items.forEach(item => {
            const v = Object.valueFromJson(item, refResolver)
            this.push(v)
        })
        return this
    }
);

Object.defineSlot(Array.prototype, "description",
    function () {
        return "[" + this.map(v => Type.describe(v)).join(", ") + "]"
    }
);

// --- Map ---

Object.defineSlot(Map.prototype, "type",
    function () {
        return this.constructor.name
    }
);

Object.defineSlot(Map.prototype, "asJson",
    function (loopCheck = new Set(), refCreator) {
        const json = {}
        json.type = this.type()
        json.entries = []
        this.forEach((v, k) => {
            const serializedV = Object.valueAsJson(v, loopCheck, refCreator)
            json.entries.push([k, serializedV])
        })
        return json
    }
);

Object.defineSlot(Map.prototype, "fromJson",
    function (json, refResolver) {
        assert(this.type() === json.type)
        assert(json.entries)
        json.entries.forEach(entry => {
            const k = entry[0]
            const serializedV = entry[1]
            const v = Object.valueFromJson(serializedV, refResolver)
            this.set(k, v)
        })
        return this
    }
);

Object.defineSlot(Map.prototype, "description",
    function () {
        let s = "Map{"
        this.forEach(v, k => s += k + ":" + Type.describe(v) + ",")
        s += "}"
        return s
    }
);


// --- Set ---

Object.defineSlot(Set.prototype, "type",
    function () {
        return this.constructor.name
    }
);

Object.defineSlot(Set.prototype, "asJson",
    function (loopCheck = new Set(), refCreator) {
        const json = {}
        json.type = this.type()
        json.items = []
        this.forEach(item => {
            const v = Object.valueAsJson(item, loopCheck, refCreator)
            json.items.push(v)
        })
        return json
    }
);

Object.defineSlot(Set.prototype, "fromJson",
    function (json, refResolver) {
        assert(this.type() === json.type)
        assert(json.items)
        json.items.forEach(item => {
            const v = Object.valueFromJson(item, refResolver)
            this.add(v)
        })
        return this
    }
);

Object.defineSlot(Set.prototype, "description",
    function () {
        let s = "Set{"
        this.forEach(v => s += Type.describe(v) + ",")
        s += "}"
        return s
    }
);


// --- String ---

Object.defineSlot(String.prototype, "asJson",
    function (loopCheck, refCreator) {
        return this
    }
);

Object.defineSlot(String.prototype, "fromJson",
    function (json, refResolver) {
        return this
    }
);

Object.defineSlot(String.prototype, "description",
    function () {
        return "\"" + this + "\""
    }
);

// --- Number ---

Object.defineSlot(Number.prototype, "asJson",
    function (loopCheck, refCreator) {
        return this
    }
);

Object.defineSlot(Number.prototype, "fromJson",
    function (json, refResolver) {
        return this
    }
);

Object.defineSlot(Number.prototype, "description",
    function () {
        return "" + this
    }
);