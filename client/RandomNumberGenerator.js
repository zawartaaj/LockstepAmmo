"use strict";

/*

    Random
    
    From: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript

    TODO: add a way to get/set the current state
*/

(class RandomNumberGenerator extends Base {
    initPrototype () {
        this.newSlot("seed", null) // a number
        this.newSlot("randFunc", null)
    }

    init () {
        super.init()
        this.setSeed(Date.now())
    }

    setSeed (seed) {
        this._seed = seed
        this.setup()
        return this
    }

    setup () {
        const sfc32 = function (a, b, c, d) {
            return function() {
              a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
              var t = (a + b) | 0;
              a = b ^ b >>> 9;
              b = c + (c << 3) | 0;
              c = (c << 21 | c >>> 11);
              d = d + 1 | 0;
              t = t + d | 0;
              c = c + t | 0;
              return (t >>> 0) / 4294967296;
            }
        }

        const f = sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, this.seed())
        this.setRandFunc(f)

    }

    random () {
        return this._randFunc()
    }

    flip () {
        return this.random() < 0.5
    }

    static selfTest () {
        const rng = this.clone()
        console.log("rng seed " + rng.seed())
        for (let i = 0; i < 10; i ++) {
            const r = rng.random()
            console.log("rng number " + i + ": " + r)
        }
    }

}.initThisClass());

//RandomNumberGenerator.selfTest()