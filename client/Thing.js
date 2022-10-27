"use strict";


(class Thing extends Serializable {
    initPrototype () {
        this.newSlot("world", null)
        this.newSlot("element", null)
        this.newSlot("view", null)
        this.newSerializableSlot("uuid", null)
        this.newSerializableSlot("position", null)
        this.newSerializableSlot("velocity", null) 
        this.newSerializableSlot("mass", 1) 
        this.newSerializableSlot("age", 0) 
        this.doesVendByCopy()
    }

    init () {
        super.init()
        this.uuid()
        this.setPosition(Vector.clone())
        this.setVelocity(Vector.clone())
        this.setMass(1)
        this.setView(BallView.clone())
    }

    setWorld (aWorld) {
        this._world = aWorld
        this.view().setPosition(this.position()).setParentView(aWorld)
        return this
    }

    updateElement () {
        this.view().setPosition(this.position())
        if (this.age() < 1000) {
            //const r = 1 - 1/(this.age()+1) // goes from 0 to 1
            const r = 1 - 1/(this.age()/50+1) // goes from 0 to 1
            const c = Math.floor(204 + (255 - 204)*(1-r))
            const c2 = Math.floor(204 + (0 - 204)*(1-r))
            const color = "rgb(" + c + "," + c + "," + c2 + ")" 
            this.view().setBackgroundColor(color)
            //console.log(this.age())
        }
        if (this.age() > 1100) {
            this.world().scheduleRemoveThing(this)
        }
        //console.log(color)
    }

    willDestroy () {
        this.view().removeFromParentView()
        this.setView(null)
    }

    timeStep () {
        const newPos = this.position().add(this.velocity())
        this.setPosition(newPos)
        this.bounceInWorld()
        this.updateElement()
        this.setAge(this.age()+1)
    }
    
    wrapInWorld () {
        const newPos = this.position().wrappedWithin(this.world().size())
        this.setPosition(newPos)
    }

    bounceInWorld () {
        const pos = this.position()
        const x = pos.x()
        const y = pos.y()

        const size = this.world().size()
        const sx = size.x()
        const sy = size.y()

        const v = this.velocity()
        let vx = v.x()
        let vy = v.y()
        
        if (x < 0 || x > sx) {
            vx = -vx
        }

        if (y < 0 || y > sy) {
            vy = -vy
        }

        this.setVelocity(Vector.clone().setX(vx).setY(vy))
    }

    pickVelocity () {
        const r = 10
        const rv = Vector.clone().setX(r*(Math.random() - 0.5)).setY(r*(Math.random() - 0.5))
        this.setVelocity(rv)
        return this
    }

}.initThisClass());

