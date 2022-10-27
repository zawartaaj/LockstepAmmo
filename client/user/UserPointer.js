"use strict";

/*

    UserPointer


*/

(class UserPointer extends Serializable {
    initPrototype () {
        this.newSlot("user", null)
        this.newSerializableSlot("position", null)
        //this.doesVendByCopy()

        this.newSlot("mouseInCallback", null)
        this.newSlot("mouseOutCallback", null)
        this.newSlot("mouseDownCallback", null)
        this.newSlot("mouseMoveCallback", null)

        this.newSlot("element", null)
        this.newSlot("delegate", null)

        this.newSlot("movesPerSecond", 30)
        this.newSlot("lastMoveSharedTime", 0)
        this.newSlot("hasMovedSinceSharing", false)
        this.newSlot("view", null)
    }

    init () {
        super.init()
        this.setView(UserPointerView.clone())
        this.view().setColor("red")
        this.setPosition(Vector.clone())
    }

    willDestroy () {
        this.view().removeFromParentView()
        this.stopListening()
    }

    setPosition (p) {
        this._position = p
        this.view().setPosition(p)
        return this
    }

    setElement (e) {
        this._element = e
        this.setupView()
        return this
    }

    setupView () {
        this.view().setParentView(this.user().world())
    }

    startListening () {
        this.startListeningForMouseDown()
        this.startListeningForMouseMove()
        this.startListeningForMouseIn()
        this.startListeningForMouseOut()
        return this
    }

    stopListening () {
        this.stopListeningForMouseDown()
        this.stopListeningForMouseMove()
        this.stopListeningForMouseIn()
        this.stopListeningForMouseOut()
        return this
    }

    // --- mouse in ---

    startListeningForMouseIn () {
        if (!this.mouseInCallback()) {
            this.setMouseInCallback((event) => this.onMouseIn(event))
            this.element().addEventListener("mousein", this.mouseInCallback())
        }
    }

    stopListeningForMouseIn () {
        if (this.mouseInCallback()) {
            this.element().removeEventListener("mousein", this.mouseInCallback())
            this.setMouseInCallback(null)
        }
    }

    onMouseIn (event) {
        this.onMouseMove(event)
    }

    // --- mouse out ---

    startListeningForMouseOut () {
        if (!this.mouseOutCallback()) {
            this.setMouseOutCallback((event) => this.onMouseOut(event))
            this.element().addEventListener("mouseout", this.mouseOutCallback())
        }
    }

    stopListeningForMouseOut () {
        if (this.mouseOutCallback()) {
            this.element().removeEventListener("mouseout", this.mouseOutCallback())
            this.setMouseOutCallback(null)
        }
    }

    onMouseOut (event) {
        this.onMouseMove(event)
    }

    // --- mouse down ---

    startListeningForMouseDown () {
        if (!this.mouseDownCallback()) {
            this.setMouseDownCallback((event) => this.onMouseDown(event))
            this.element().addEventListener("mousedown", this.mouseDownCallback())
        }
    }

    stopListeningForMouseDown () {
        if (this.mouseDownCallback()) {
            this.element().removeEventListener("mousedown", this.mouseDownCallback())
            this.setMouseDownCallback(null)
        }
    }

    onMouseDown (event) {
        this.setPosition(this.positionForEvent(event))
        this.setHasMovedSinceSharing(true)

        if (this.delegate().onMouseDown) {
            this.delegate().onMouseDown(event)
        }
        event.stopPropagation()
    }

    // --- mouse move ---

    startListeningForMouseMove () {
        if (!this.mouseMoveCallback()) {
            this.setMouseMoveCallback((event) => this.onMouseMove(event))
            this.element().addEventListener("mousemove", this.mouseMoveCallback())
        }
    }

    stopListeningForMouseMove () {
        if (this.mouseMoveCallback()) {
            this.element().removeEventListener("mousemove", this.mouseMoveCallback())
            this.setMouseMoveCallback(null)
        }
    }

    positionForEvent (e) {
        const rect = this.element().getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return Vector.clone().setX(x).setY(y)
    }

    onMouseMove (event) {
        this.setPosition(this.positionForEvent(event))
        this.setHasMovedSinceSharing(true)

        if (this.delegate().onMouseMove) {
            this.delegate().onMouseMove(event)
        }
        event.stopPropagation()
    }

    shareMoveIfReady () {
        if (this.hasMovedSinceSharing()) {
            const now = Date.now()
            const dt = now - this.lastMoveSharedTime()
            const period = 1000/this.movesPerSecond()
            if (dt > period) {
                this.setHasMovedSinceSharing(false)
                this.setLastMoveSharedTime(now)
                this.sharePosition()
            }
        }
    }

    sharePosition () {
        const p = this.position()
        const rm = RemoteMessage.creationProxy().updateUserPointer(this.user().id(), p.x(), p.y())
        const channel = this.user().world().channel()
        channel.asyncRelayMessageFrom(rm, this.user().world().relayClient()) //.ignoreResponse()
    }

    timeStep () {
        this.shareMoveIfReady()
    }

    onSyncTick () {

    }



}.initThisClass());