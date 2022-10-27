"use strict";

(class DOResultResponse extends Serializable {

    initPrototype () {
        this.newSerializableSlot("messageId", null)
        this.newSerializableSlot("result", null)
        this.newSerializableSlot("resultType", null)
    }

    /*
    init () {
        super.init()
    }
    */

    setResult (v) {
        this._result = v
        this.setResultType(Type.describe(v))
        return this
    }

    description () {
        //return this.type() + " msg." + this.messageId() + " -> " + this.resultDescription()
        return this.type() + ": " + this.resultDescription()
    }

    valueDescription (v) {
        if (v && v.distantObjectForProxy) {
            return "Proxy->" + v.distantObjectForProxy().description()
        }

        return Type.describe(v)
    }

    resultDescription () {
        const result = this.result()
        if (result && result.distantObjectForProxy) {
            return "Proxy->" + result.distantObjectForProxy().description()
        }
        //return JSON.stringify(result)
        if (Array.isArray(result)) {
            return "[" + result.map(v => this.valueDescription(v)).join(", ") + "]"
        }

        return Type.describe(result)
    }

}.initThisClass());
