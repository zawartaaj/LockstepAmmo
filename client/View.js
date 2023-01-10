"use strict";

/*

    View


*/

(class View extends Base {
    initPrototype () {
        this.newSlot("element", null)
        this.newSlot("position", null)
    }

    init () {
        super.init()
        this.setPosition(Vector.clone())
        this.setup()
    }

    setup () {
        this.setupElement()
        this.setupStyle()
        this.setupInnerHtml()
        return this
    }

    setupInnerHtml () {
    }

    setParentView (aView) {
        aView.element().appendChild(this.element())
        return this
    }

    removeFromParentView () {
        const e = this.element()
        const parent = e.parentNode
        if (parent) {
            parent.removeChild(e)
        }
        return this
    }

    setOpacity (v) {
        this.element().style.opacity = v
        return this
    }

    setColor (v) {
        this.element().style.color = v
        return this
    }

    setBackgroundColor (v) {
        this.element().style.backgroundColor = v
        return this
    }

    setupElement () {
        const e = document.createElement('span')
        this.setElement(e)
    }

    setupStyle () {
        const es = this.element().style
        es.position = "absolute"
    }

    setPosition (p) {
        this._position = p 
        this.updateElementPosition()
        return this
    }

    updateElementPosition () {
        if (this.element()) {
            const es = this.element().style
            const p = this.position()
            es.left = p.x() + "px"
            es.top = p.y() + "px"
        }
        return this
    }

    timeStep () {

    }
    

}.initThisClass());

