"use strict";


(class BallView extends View {
    initPrototype () {

    }

    init () {
        super.init()
    }

    setupStyle () {
        super.setupStyle()
        const es = this.element().style
        //es.border = "1px solid #888"
        es.backgroundColor = "#ccc"
        es.margin = "3px"
        es.padding = "3px"

        es.width = "4px"
        es.maxWidth = "4px"

        es.maxHeight = "4px"
        es.height = "4px"
        es.borderRadius = "50%";
        //es.border = "1px dashed yellow"

        es.overflow = "auto";
        es.fontFamily = "monospace";
        es.fontSize = "0em";
    }

    

}.initThisClass());

