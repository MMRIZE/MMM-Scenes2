/* global Log MM */


function asleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

class Scenes {
  #scenario = []
  #options = {}
  #index = 0
  #timer = null
  #timerStarted = null
  #pausedRemaining = 0
  #updateCallback = () => { }
  constructor({ scenario = [], defaults = {}, options = {}, updator = () => { } }) {
    this.#updateCallback = updator
    this.#options = options
    this.#scenario = scenario.map((scene, index) => {
      const enter = (scene.enter || []).map((role) => {
        if (typeof role === 'string') {
          return {
            role,
            ...defaults.defaultEnter,
          }
        }
        return {
          ...defaults.defaultEnter,
          ...role,
        }
      })

      const exit = (scene.exit || []).map((role) => {
        if (typeof role === 'string') {
          return {
            role,
            ...defaults.defaultExit,
          }
        }
        return {
          ...defaults.defaultExit,
          ...role,
        }
      })
      return {
        name: scene.name || `scene_${index + 1}`,
        activeIndicator: String(scene.activeIndicator || defaults.activeIndicator || index),
        inactiveIndicator: String(scene.inactiveIndicator || defaults.inactiveIndicator || index),
        enter,
        exit,
        life: scene.life ?? defaults.life,
        next: (scene.next === false) ? false : (scene.next === 0) ? 0 : (scene.next || null),
        previous: (scene.previous === false) ? false : (scene.previous === 0) ? 0 : (scene.previous || null),
      }
    })
  }

  get length() {
    return this.#scenario.length
  }

  get indicators() {
    return {
      active: this.#scenario.map(scene => scene.activeIndicator),
      inactive: this.#scenario.map(scene => scene.inactiveIndicator)
    }
  }

  get index() {
    return this.#index
  }

  #findSceneIndex(id) {
    const found = this.#scenario.findIndex(scene => scene.name === id)
    if (found >= 0) return found
    const index = parseInt(id)
    if (!isNaN(index) && index >= 0 && index < this.#scenario.length) return index
    return null
  }

  async play(id) {
    let result = {
      status: false,
      currentScene: null,
      index: null,
      message: "Scene not found"
    }
    const lockString = this.#options.lockString
    const sceneIndex = this.#findSceneIndex(id) ?? this.#index
    const scene = this.#scenario[ sceneIndex ]
    if (!scene) return result
    this.#index = sceneIndex
    this.#pausedRemaining = 0

    const exitAll = async function () {
      const roles = scene.exit || []
      if (roles.length < 1) return
      for (const role of roles) {
        const modules = MM.getModules().withClass(role.role).filter(module => !module.hidden)
        for (const module of modules) {
          MM.hideModule(module, role.duration, () => {}, {
            lockString,
            animate: role.animation,
          })
          await asleep(role.gap)
        }
      }
    }
    const enterAll = async function () {
      const roles = scene.enter || []
      if (roles.length < 1) return
      for (const role of roles) {
        const modules = MM.getModules().withClass(role.role).filter(module => module.hidden)
        for (const module of modules) {
          MM.showModule(module, role.duration, () => {}, {
            lockString,
            animate: role.animation,
          })
          await asleep(role.gap)
        }
      }
      return true
    }

    Log.log("[SCENE] Scene transition starts:", scene.name)
    await exitAll()
    this.#updateCallback()
    await enterAll()
    Log.log("[SCENE] Scene will live:", scene.name, scene.life)
    if (!isNaN(scene.life) && scene.life > 0) {
      clearTimeout(this.#timer)
      this.#timer = null
      this.#timerStarted = new Date(Date.now())
      this.#timer = setTimeout(() => {
        clearTimeout(this.#timer)
        this.next()
      }, scene.life)
    }
    return {
      status: true,
      currentScene: scene,
      index: sceneIndex,
      message: "Scene Played"
    }
  }

  async pause() {
    const life = this.#scenario[ this.#index ].life
    this.#pausedRemaining = life - ((this.#timerStarted) ? this.#timerStarted - new Date(Date.now()) : 0)
    clearTimeout(this.#timer)
    this.#timer = null
    this.#timerStarted = null
    let result = {
      message: "Scene Paused",
      status: true,
      currentScene: this.#scenario[ this.#index ],
      index: this.#index,
    }
    Log.log(result, `Remaining: ${this.#pausedRemaining}`)
    return result
  }

  async resume() {
    if (this.#pausedRemaining > 0) {
      this.#timerStarted = new Date(Date.now())
      clearTimeout(this.#timer)
      this.#timer = setTimeout(() => {
        clearTimeout(this.#timer)
        this.next()
      }, this.#pausedRemaining)
    }
    let result = {
      message: "Scene Resumed",
      status: true,
      currentScene: this.#scenario[ this.#index ],
      index: this.#index,
    }
    Log.log(result, `Resumed: ${this.#pausedRemaining}`)
    return result
  }

  async next() {
    const scene = this.getScene(this.#index)
    if (!scene) return {
      status: false,
      currentScene: null,
      index: this.#index,
      message: "Something wrong. Invalid index:" + this.#index 
    }
    const param = { scene: {...scene}, scenario: [...this.#scenario] }
    const sn = (typeof scene.next === 'function') ? scene.next(param) : scene.next
    const nextIndex = (sn === false) 
      ? false 
      : (sn === 0) 
        ? 0 
        : (sn) 
          ? this.#findSceneIndex(sn) 
          : ((this.#index + 1) >= this.#scenario.length ? 0 : this.#index + 1)
    
    if (nextIndex === false) return await this.current()

    this.#index = nextIndex
    return await this.play(this.#index)
  }

  async previous() {
    const scene = this.getScene(this.#index)
    if (!scene) return {
      status: false,
      currentScene: null,
      index: this.#index,
      message: "Something wrong. Invalid index:" + this.#index 
    }
    const param = { scene: {...scene}, scenario: [...this.#scenario] }
    const sp = (typeof scene.previous === 'function') ? scene.previous(param) : scene.previous
    const prevIndex = (sp === false)
      ? false
      : (sp === 0) 
        ? 0 
        : (sp) 
          ? this.#findSceneIndex(sp) 
          : ((this.#index - 1) < 0 ? this.#scenario.length - 1 : this.#index - 1)

    if (prevIndex === false) return await this.current()

    this.#index = prevIndex
    return await this.play(this.#index)
  }

  async current() {
    return {
      status: true,
      currentScene: this.#scenario[ this.#index ],
      index: this.#index,
      message: "Current Scene"
    }
  }

  getScene(id) {
    return this.#scenario.find(scene => scene.name === id) || this.#scenario[ id ] || null
  }
}


Log.log('[Scenes]: Library loaded')
export { Scenes }