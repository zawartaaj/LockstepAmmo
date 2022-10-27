"use strick";

(class GraphicsEngine extends Base {

  initPrototype () {
    this.newSlot("app", null)
    this.newSlot("canvas", null)
    this.newSlot("gl", null)
    this.newSlot("scene", null)
    this.newSlot("light", null)
    this.newSlot("windowResizeCallback", null)
    //this.newSlot("mouseDownCallback", null)
  }

  init () {
    super.init()
  }

  setup () {  
    console.log(this.type() + ".setup()")
    this.setupCanvas()
    this.setupScene() 
    this.setupLight()
    this.setupMouseController()

    //this.mainLoop()
    this.startListeningForWindowResize()
    return this
  }

  setupCanvas () {
    CubicVR.GLCore.fixed_size = null
    const gl = CubicVR.GLCore.init(); // creates a canvas and adds to body?
    this.setCanvas(CubicVR.GLCore.canvas)
  
    if (!gl) {
      alert("Sorry, no WebGL support :(");
      return;
    };
    this.setGl(gl)
    this.setupCanvasSize()
  }

  setupCanvasSize () {
    const canvas = this.canvas()
    canvas.style.display = "block"
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log("canvas " + canvas.width + "x" + canvas.height)
  }

  setupScene () {
    const canvas = this.canvas()
    const scene = new CubicVR.Scene(canvas.width, canvas.height, 70);
    this.setScene(scene)

    scene.camera.position = [30, 30, 30];
    scene.camera.target = [0, 0, 0];
  }

  setupLight () {
    const light = new CubicVR.Light({
      type:CubicVR.enums.light.type.POINT,
      intensity: 0.9,
      areaCeiling: 40,
      areaFloor: -40,
      areaAxis: [15, 10],
      distance: 60,
      position: [10, 10, 10],
      mapRes: 1024
    });

    light.lookat(0, 0, 0)

    this.scene().bindLight(light);
    this.setLight(light)

    CubicVR.setGlobalAmbient([0.3,0.3,0.3]);
    CubicVR.addResizeable(this.scene());
  }

  setupMouseController () {
    const mvc = new CubicVR.MouseViewController(this.canvas(), this.scene().camera);
  }

  mainLoop () {
    console.log("mainLoop")
    CubicVR.MainLoop((timer, gl) => {
      this.app().nextFrame() 
    })
  }

  // --- window resize ---

  startListeningForWindowResize () {
    if (!this.windowResizeCallback()) {
        this.setWindowResizeCallback((event) => this.onWindowResize(event))
        window.addEventListener("resize", this.windowResizeCallback())
    }
  }

  onWindowResize (event) {
    this.setupCanvasSize()
  }

  element () {
    return document.body
  }

  render () {
    this.scene().render()
    return this
  }

  // --- mouse down ---
/*
  startListeningForMouseDown () {
    if (!this.mouseDownCallback()) {
        this.setMouseDownCallback((event) => this.onMouseDown(event))
        this.element().addEventListener("mousedown", this.mouseDownCallback())
    }
  }

  onMouseDown (event) {
    const p = this.positionForEvent(event)
    this.addOneBoxBody(p)
  }

  addOneBoxBody (point) {
    let x = point.x
    let y = point.y
    const w = this.element().clientWidth
    const h = this.element().clientHeight

    const r = 1/30
    x = (x - w/2) * r
    y = -(y - h/2) * r
    //console.log("point: ", x, y)

    this.addBoxThing()
  }

  positionForEvent (e) {
    const rect = this.element().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x: x, y: y }
  }
  */

}.initThisClass());

