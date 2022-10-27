
"use strict";

/*


*/

const isInBrowser = (typeof(document) !== 'undefined');
let ws = getGlobalThis()["WebSocket"]

if (!ws) {
    ws = require('ws');
}

Object.defineSlot(ws.prototype, "readyStateName",
    function () {
        const states = ["connecting", "open", "closing", "closed"]
        const stateIndex = this.readyState
        return states[stateIndex]
    }
);

Object.defineSlot(ws.prototype, "isOpen",
    function () {
        return this.readyStateName() === "open"
    }
);

