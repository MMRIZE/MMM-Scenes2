/* global Log MM */

function delay(ms) {
  return new Promise(resolve => globalThis.setTimeout(resolve, ms))
}

/**
 * Convert shorthand role names to role objects and apply default settings.
 *
 * @param {Array<string|Object>} roles Scene roles to normalize.
 * @param {Object} roleDefaults Default settings for each role.
 * @returns {Array<Object>} Normalized role objects.
 */
function normalizeRoles(roles, roleDefaults) {
  return (roles || []).map((role) => {
    if (typeof role === 'string') {
      return { role, ...roleDefaults }
    }
    return { ...roleDefaults, ...role }
  })
}

class Scenes {
  #scenario = []
  #options = {}
  #index = 0
  #timer = null
  #timerStarted = null
  #pausedRemaining = 0
  #transitionId = 0
  #onChange = () => { }

  constructor({ scenario = [], defaults = {}, options = {}, onChange, updator } = {}) {
    this.#onChange = onChange || updator || this.#onChange
    this.#options = options
    this.#scenario = scenario.map((scene, index) => {
      const enter = normalizeRoles(scene.enter, defaults.defaultEnter)
      const exit = normalizeRoles(scene.exit, defaults.defaultExit)
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
      inactive: this.#scenario.map(scene => scene.inactiveIndicator),
    }
  }

  get index() {
    return this.#index
  }

  #findSceneIndex(id) {
    const found = this.#scenario.findIndex(scene => scene.name === id)
    if (found >= 0) return found
    if (id === null || id === undefined || id === '') return null
    const index = Number(id)
    if (Number.isInteger(index) && index >= 0 && index < this.#scenario.length) return index
    return null
  }

  #clearTimer() {
    globalThis.clearTimeout(this.#timer)
    this.#timer = null
    this.#timerStarted = null
  }

  #scheduleNext(life) {
    if (isNaN(life) || life <= 0) return
    this.#timerStarted = Date.now()
    this.#timer = globalThis.setTimeout(() => {
      this.#clearTimer()
      void this.next().catch(error => Log.error(error))
    }, life)
  }

  async play(id) {
    const transitionId = ++this.#transitionId
    const isCurrentTransition = () => transitionId === this.#transitionId
    this.#clearTimer()
    let result = {
      status: false,
      currentScene: null,
      index: null,
      message: 'Scene not found',
    }
    const lockString = this.#options.lockString
    const sceneIndex = this.#findSceneIndex(id) ?? this.#index
    const scene = this.#scenario[sceneIndex]
    if (!scene) return result
    this.#index = sceneIndex
    this.#pausedRemaining = 0

    const transitionRoles = async (roles, isVisible, transition) => {
      if (roles.length < 1) return true
      for (const role of roles) {
        const modules = MM.getModules().withClass(role.role).filter(isVisible)
        for (const module of modules) {
          if (!isCurrentTransition()) return false
          transition(module, role)
          await delay(role.gap)
          if (!isCurrentTransition()) return false
        }
      }
      return true
    }
    const exitAll = () => transitionRoles(
      scene.exit || [],
      module => !module.hidden,
      (module, role) => MM.hideModule(module, role.duration, () => {}, {
        lockString,
        animate: role.animation,
      }),
    )
    const enterAll = () => transitionRoles(
      scene.enter || [],
      module => module.hidden,
      (module, role) => MM.showModule(module, role.duration, () => {}, {
        lockString,
        animate: role.animation,
      }),
    )

    Log.log('[SCENE] Scene transition starts:', scene.name)
    if (!await exitAll() || !isCurrentTransition()) return {
      status: false,
      currentScene: this.#scenario[this.#index] || null,
      index: this.#index,
      message: 'Scene transition superseded',
    }
    if (!await enterAll() || !isCurrentTransition()) return {
      status: false,
      currentScene: this.#scenario[this.#index] || null,
      index: this.#index,
      message: 'Scene transition superseded',
    }
    await this.#onChange()
    Log.log('[SCENE] Scene will live:', scene.name, scene.life)
    this.#scheduleNext(scene.life)
    return {
      status: true,
      currentScene: scene,
      index: sceneIndex,
      message: 'Scene Played',
    }
  }

  async pause() {
    const scene = this.#scenario[this.#index]
    if (!scene) return {
      message: 'No current scene',
      status: false,
      currentScene: null,
      index: null,
    }
    const life = scene.life
    const elapsed = this.#timerStarted !== null ? Date.now() - this.#timerStarted : 0
    this.#pausedRemaining = Math.max(0, life - elapsed)
    this.#clearTimer()
    let result = {
      message: 'Scene Paused',
      status: true,
      currentScene: this.#scenario[this.#index],
      index: this.#index,
    }
    Log.log(result, `Remaining: ${this.#pausedRemaining}`)
    return result
  }

  async resume() {
    const scene = this.#scenario[this.#index]
    if (!scene) return {
      message: 'No current scene',
      status: false,
      currentScene: null,
      index: null,
    }
    if (this.#pausedRemaining > 0) {
      this.#scheduleNext(this.#pausedRemaining)
    }
    this.#pausedRemaining = 0
    let result = {
      message: 'Scene Resumed',
      status: true,
      currentScene: this.#scenario[this.#index],
      index: this.#index,
    }
    Log.log(result, `Resumed: ${this.#pausedRemaining}`)
    return result
  }

  async #move(direction) {
    const scene = this.getScene(this.#index)
    if (!scene) return {
      status: false,
      currentScene: null,
      index: this.#index,
      message: 'Something wrong. Invalid index:' + this.#index,
    }
    const param = { scene: { ...scene }, scenario: [...this.#scenario] }
    const target = (typeof scene[direction] === 'function')
      ? scene[direction](param)
      : scene[direction]
    const targetIndex = (target === false)
      ? false
      : (target === 0)
          ? 0
          : (target)
              ? this.#findSceneIndex(target)
              : (direction === 'next')
                  ? ((this.#index + 1) >= this.#scenario.length ? 0 : this.#index + 1)
                  : ((this.#index - 1) < 0 ? this.#scenario.length - 1 : this.#index - 1)

    if (targetIndex === false) return await this.current()
    if (targetIndex === null) {
      return {
        status: false,
        currentScene: scene,
        index: this.#index,
        message: 'Target scene not found',
      }
    }

    this.#index = targetIndex
    return await this.play(this.#index)
  }

  async next() {
    return await this.#move('next')
  }

  async previous() {
    return await this.#move('previous')
  }

  command(command, payload = {}) {
    const actions = {
      SCENES_PLAY: () => this.play(payload.scene ?? null),
      SCENES_NEXT: () => this.next(),
      SCENES_PREV: () => this.previous(),
      SCENES_PAUSE: () => this.pause(),
      SCENES_RESUME: () => this.resume(),
      SCENES_CURRENT: () => this.current(),
    }
    const action = actions[command]
    if (!action) {
      return Promise.resolve({
        status: false,
        index: null,
        currentScene: null,
        message: 'Invalid command',
      })
    }
    return action()
  }

  async current() {
    const scene = this.#scenario[this.#index]
    if (!scene) return {
      status: false,
      currentScene: null,
      index: null,
      message: 'No current scene',
    }
    return {
      status: true,
      currentScene: scene,
      index: this.#index,
      message: 'Current Scene',
    }
  }

  getScene(id) {
    const index = this.#findSceneIndex(id)
    return index === null ? null : this.#scenario[index]
  }
}

Log.log('[Scenes]: Library loaded')
export { Scenes }
