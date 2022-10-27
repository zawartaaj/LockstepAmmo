"use strict";

/*

    Vector
    
    TODO: convert to use TypedArray to store values? 
    If so, will need to add TypeArray serialization support.

*/

(class Vector extends Serializable {
    initPrototype () {
        this.newSerializableSlot("x", 0)
        this.newSerializableSlot("y", 0) 
        this.newSerializableSlot("z", 0) 
    }

    setXYZ (x, y, z) {
        this.setX(x)
        this.setY(y)
        this.setZ(z)
        return this
    }

    add (aVector) {
        const v = Vector.clone()
        v.setX(this.x() + aVector.x())
        v.setY(this.y() + aVector.y())
        v.setZ(this.z() + aVector.z())
        return v
    }

    privateWrap (v1, v2) {
        let v = v1 % v2
        if (v < 0) {
            v = v2 - v
        }
        return v
    }

    wrappedWithin (aSize) {
        const nx = this.privateWrap(this.x(), aSize.x())
        const ny = this.privateWrap(this.y(), aSize.y())
        return Vector.clone().setX(nx).setY(ny)
    }

    simHash () {
        return [this.x(), this.y(), this.z()].simHash()
    }

}.initThisClass());
