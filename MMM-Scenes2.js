/* global Module Log */

Module.register('MMM-Scenes2', {
  defaults: {
    scenario: [],
    autoStart: true,
    lockString: 'mmm-scenes2',
    defaultEnter: {},
    defaultExit: {},
    activeIndicator: '■',
    inactiveIndicator: '□',
    life: 1000 * 60,
  },

  predefined: {
    defaultExit: {
      animation: 'fadeOut',
      duration: 1000,
      gap: 100,
    },
    defaultEnter: {
      animation: 'fadeIn',
      duration: 1000,
      gap: 100,
    },
  },

  getStyles: function () {
    return ['MMM-Scenes2.css']
  },

  getCommands: function (commander) {
    commander.add({
      command: 'scenes',
      description: 'Play next|prev|pause|resume|info or name:str|index:number\nTry `/scene next` or `/scene index:0`.',
      callback: 'command_scene',
      args_pattern: [/info|next|prev|pause|resume|play/, /name:(\w+)/, /index:(\d+)/],
      args_mapping: ['command', 'scenename', 'sceneindex'],
    })
  },

  command_scene: function (command, handler) {
    const commandMap = {
      info: 'SCENES_CURRENT',
      next: 'SCENES_NEXT',
      prev: 'SCENES_PREV',
      pause: 'SCENES_PAUSE',
      resume: 'SCENES_RESUME',
    }

    const tCommand = handler.args['command'] || null
    const commandName = commandMap[tCommand] || null
    if (tCommand && commandName) {
      this.command(commandName, {
        callback: (result) => {
          const message = result.currentScene
            ? `Scene command [${tCommand}] : ${result.currentScene.name}`
            : `Scene command [${tCommand}] failed: ${result.message}`
          handler.reply('TEXT', message)
        },
      })
      return
    }

    const id = handler.args?.['scenename']?.[1] || handler.args?.['sceneindex']?.[1]
    if (id || id >= 0) {
      this.command('SCENES_PLAY', {
        scene: id,
        callback: (result) => {
          const message = result.currentScene
            ? 'Playing scene.\nScene name: ' + result.currentScene.name
            : 'Unable to play scene: ' + result.message
          handler.reply('TEXT', message)
        },
      })
    }
    else {
      handler.reply('TEXT', 'Invalid scene.')
    }
    return
  },

  start: function () {
    let mmVersion = (typeof window?.mmVersion !== 'undefined') ? window.mmVersion : null
    if (!mmVersion || mmVersion.localeCompare('2.25.0') < 0) {
      Log.error(`Your MagicMirror version is ${mmVersion}. This module requires version 2.25.0 or greater.`)
      return
    }
    this.config.defaultEnter = { ...this.predefined.defaultEnter, ...this.config.defaultEnter }
    this.config.defaultExit = { ...this.predefined.defaultExit, ...this.config.defaultExit }
    this.scenario = null
    let _loadModule = new Promise((resolve, reject) => {
      try {
        import('/' + this.file('library.mjs')).then(({ Scenes }) => {
          this.scenario = new Scenes({
            scenario: this.config.scenario,
            defaults: {
              defaultEnter: this.config.defaultEnter,
              defaultExit: this.config.defaultExit,
              activeIndicator: this.config.activeIndicator,
              inactiveIndicator: this.config.inactiveIndicator,
              life: this.config.life,
            },
            options: {
              lockString: this.config.lockString,
            },
            onChange: async () => {
              this.updateDom(0)
              const result = await this.scenario.current()
              this.sendNotification('SCENES_CHANGED', result)
            },
          })
          resolve()
        })
      }
      catch (e) {
        reject(e)
      }
    })
    _loadModule.then(() => {
      this._start()
    }).catch((e) => {
      Log.error(e)
    })
  },

  _start: function () {
    this.ready = true
    if (this.config.autoStart) this.scenario.play()
  },

  getDom: function () {
    const dom = document.createElement('div')
    dom.classList.add('scenes_indicator')

    if (!this.ready) return dom

    const { active, inactive } = this.scenario.indicators
    const index = this.scenario.index

    for (let i = 0; i < inactive.length; i++) {
      const d = document.createElement('span')
      d.classList.add('scenes_indicator_scene')
      d.classList.add('index_' + i)
      d.dataset.index = i
      d.onclick = () => {
        const index = parseInt(d.dataset.index)
        Log.log('Scene indicator clicked: ' + index)
        this.command('SCENES_PLAY', { scene: index })
      }
      if (i === 0) {
        d.classList.add('first')
      }
      if (i === inactive.length - 1) {
        d.classList.add('last')
      }
      if (index === i) {
        d.classList.add('active')
        d.innerHTML = active[i]
      }
      else {
        d.classList.add('inactive')
        d.innerHTML = inactive[i]
      }
      dom.appendChild(d)
    }

    return dom
  },

  notificationReceived: function (notification, payload) {
    const availableCommand = [
      'SCENES_PLAY',
      'SCENES_NEXT',
      'SCENES_PREV',
      'SCENES_CURRENT',
      'SCENES_PAUSE',
      'SCENES_RESUME',
    ]

    if (availableCommand.includes(notification)) {
      this.command(notification, payload)
    }
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === 'ACTION') {
      this.command(payload?.command, { scene: payload?.scene ?? null })
    }
  },

  command: function (command, payload) {
    const notyet = {
      status: false,
      index: null,
      currentScene: null,
      message: 'Not ready yet.',
    }
    const userFunc = (typeof payload?.callback === 'function') ? payload.callback : () => { }

    if (!this.scenario) return userFunc(notyet)

    const commandActions = {
      SCENES_PLAY: () => this.scenario.play(payload?.scene ?? null),
      SCENES_NEXT: () => this.scenario.next(),
      SCENES_PREV: () => this.scenario.previous(),
      SCENES_PAUSE: () => this.scenario.pause(),
      SCENES_RESUME: () => this.scenario.resume(),
      SCENES_CURRENT: () => this.scenario.current(),
    }
    const action = commandActions[command]
    if (!action) return userFunc({ ...notyet, message: 'Invalid command' })

    return action().then(userFunc)
  },

})
