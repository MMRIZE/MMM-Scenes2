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
    const exitAll = function () {
      const exitDone = []
      const roles = scene.exit || []
      return new Promise(async (resolve, reject) => {
        if (roles.length < 1) resolve()
        /*
        const maxDuration = roles.reduce((max, role) => {
          return Math.max(max, role.duration)
        }, 0) * 2
        const timeout = new Promise((done, rej) => {
          setTimeout(() => {
            done('by timeout')
          }, maxDuration)
        })
        */
        for (const role of roles) {
          const modules = MM.getModules().withClass(role.role).filter(module => !module.hidden)
          for (const module of modules) {
            exitDone.push(new Promise(async (done, rej) => {
              MM.hideModule(module, role.duration, () => {
                done(module.name)
              }, {
                lockString,
                animate: role.animation,
              })
            }))
            await asleep(role.gap)
          }
        }
        /*
        const _done = Promise.allSettled(exitDone)
        Promise.any([ _done, timeout ]).then((result) => {
          resolve(result)
        })
        */
        Promise.allSettled(exitDone).then((res) => {
          resolve(res)
        })
      })
    }

    const enterAll = function () {
      const enterDone = []
      const roles = scene.enter || []

      return new Promise(async (resolve, reject) => {
        if (roles.length < 1) resolve()
        /*
        const maxDuration = roles.reduce((max, role) => {
          return Math.max(max, role.duration)
        }, 0) + (role.gap * roles.length)
        const timeout = new Promise((done, rej) => {
          setTimeout(() => {
            done('by timeout')
          }, maxDuration)
        })
        */
        for (const role of roles) {
          const modules = MM.getModules().withClass(role.role).filter(module => module.hidden)
          for (const module of modules) {
            enterDone.push(new Promise(async (done, rej) => {
              MM.showModule(module, role.duration, () => {
                done(module.name)
              }, {
                lockString,
                animate: role.animation,
              })
            }))
            await asleep(role.gap)
          }
        }
        //console.log(enterDone)
        /*
        const _done = Promise.allSettled(enterDone)
        Promise.any([ _done, timeout ]).then((result) => {
          resolve(result)
        })
        */
        Promise.allSettled(enterDone).then((res) => {
          resolve(res)
        })
      })
    }

    Log.log("[SCENE] Scene transition starts:", scene.name)
    await exitAll()
    this.#updateCallback()
    await enterAll()
    Log.log("[SCENE] Scene will live:", scene.name, scene.life)
    if (!isNaN(scene.life) && scene.life > 0) {
      clearTimeout(this.#timer)
      this.#timer = null
      this.#timerStarted = new Date()
      this.#timer = setTimeout(() => {
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
    this.#pausedRemaining = life - ((this.#timerStarted) ? this.#timerStarted - new Date() : 0)
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
      this.#timerStarted = new Date()
      this.#timer = setTimeout(() => {
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
    this.#index = (this.#index + 1) >= this.#scenario.length ? 0 : this.#index + 1
    return await this.play(this.#index)
  }

  async previous() {
    this.#index = (this.#index) <= 0 ? this.#scenario.length - 1 : this.#index - 1
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