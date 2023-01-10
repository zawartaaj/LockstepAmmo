"use strict";

class Boot extends Object {

  files () {
    return [
      "shared/Base/getGlobalThis.js",
      "shared/Base/Base.js",
      "shared/Base/Type.js",

      "shared/libs/Ammo/AmmoFormatted.js",
      //"shared/libs/CubicVR/CubicVR.js",
      "shared/libs/CubicVR/CubicVR_formatted.js",
      //"shared/libs/CubicVR/CubicVR.min.js",

      "shared/WebSockets/WebSocket-helpers.js",
      "shared/WebSockets/WsConnection.js",

      "shared/DistributedObjects/Serializable.js",
      "shared/DistributedObjects/Serializable-helpers.js",
      "shared/DistributedObjects/RemoteMessage.js",
      "shared/DistributedObjects/DOFuture.js",
      "shared/DistributedObjects/DORef.js",
      "shared/DistributedObjects/DOConnection.js",
      "shared/DistributedObjects/DistantObject.js",
      "shared/DistributedObjects/response/DOResponse.js",
      "shared/DistributedObjects/response/DOResultResponse.js",
      "shared/DistributedObjects/response/DOErrorResponse.js",

      "client/engine/SimEngine.js",
      "client/engine/GraphicsEngine.js",
      "client/engine/PhysicsEngine.js",
      "client/engine/SimThing.js",
      "client/engine/BoxThing.js",

      "client/Vector.js",
      "client/SimHash-helpers.js",
      "client/View.js",
      "client/BallView.js",
      "client/user/User.js",
      "client/user/UserPointer.js",
      "client/user/ActionGroup.js",
      "client/user/UserPointerView.js",
      "client/RandomNumberGenerator.js",
      "client/SimApp.js",
    ]
  }

  start () {
    this._queue = this.files().slice()
    this.loadNext()
  }

  loadNext () {
    if (this._queue.length) {
      const file = this._queue.shift()
      this.loadScript(file, () => this.loadNext())
    } else {
      this.didFinish()
    }
  }

  loadScript (url, callback) {
    //console.log("load url '" + url + "'")
    const head = document.getElementsByTagName('head')[0];
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.onreadystatechange = (event) => {
      callback();
    }
    script.onload = callback;
    script.onerror = (error) => {
      console.log(error)
    }
    head.appendChild(script);
  }

  didFinish () {
    SimApp.launch();
  }
};

new Boot().start()
