import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { describe, it } from 'node:test'

const moduleSource = fs.readFileSync(new URL('../../MMM-Scenes2.js', import.meta.url), 'utf8')

function loadModule() {
  let definition
  const context = {
    Log: { error() {}, log() {} },
    Module: {
      register: (_name, moduleDefinition) => {
        definition = moduleDefinition
      },
    },
    window: { mmVersion: '2.25.0' },
  }
  vm.runInNewContext(moduleSource, context)
  return definition
}

describe('MMM-Scenes2 adapter', () => {
  it('routes scene commands through the library', async () => {
    const moduleDefinition = loadModule()
    const calls = []
    moduleDefinition.scenario = {
      command: (command, payload) => {
        calls.push({ command, payload })
        return Promise.resolve({ status: true, command })
      },
    }

    let result
    await moduleDefinition.command('SCENES_PLAY', {
      scene: 'evening',
      callback: (value) => {
        result = value
      },
    })
    await moduleDefinition.command('SCENES_NEXT', {
      callback: (value) => {
        result = value
      },
    })

    assert.equal(calls.length, 2)
    assert.equal(calls[0].command, 'SCENES_PLAY')
    assert.equal(calls[0].payload.scene, 'evening')
    assert.equal(typeof calls[0].payload.callback, 'function')
    assert.equal(calls[1].command, 'SCENES_NEXT')
    assert.equal(typeof calls[1].payload.callback, 'function')
    assert.equal(result.command, 'SCENES_NEXT')
  })

  it('reports invalid commands without calling the library', async () => {
    const moduleDefinition = loadModule()
    const calls = []
    moduleDefinition.scenario = {
      command: (...args) => {
        calls.push(args)
        return Promise.resolve({ status: true })
      },
    }

    let result
    await moduleDefinition.command('SCENES_UNKNOWN', {
      callback: (value) => {
        result = value
      },
    })

    assert.equal(calls.length, 1)
    assert.equal(calls[0][0], 'SCENES_UNKNOWN')
    assert.equal(typeof calls[0][1].callback, 'function')
    assert.equal(result.status, true)
  })

  it('returns a controlled response before library initialization', () => {
    const moduleDefinition = loadModule()
    let result

    moduleDefinition.command('SCENES_CURRENT', {
      callback: (value) => {
        result = value
      },
    })

    assert.equal(result.status, false)
    assert.equal(result.index, null)
    assert.equal(result.currentScene, null)
    assert.equal(result.message, 'Not ready yet.')
  })

  it('forwards only supported notifications', () => {
    const moduleDefinition = loadModule()
    const calls = []
    moduleDefinition.command = (command, payload) => {
      calls.push({ command, payload })
    }

    moduleDefinition.notificationReceived('SCENES_NEXT', { source: 'test' })
    moduleDefinition.notificationReceived('UNRELATED', { source: 'test' })
    moduleDefinition.socketNotificationReceived('ACTION', { command: 'SCENES_PAUSE', scene: 'ignored' })

    assert.equal(calls.length, 2)
    assert.equal(calls[0].command, 'SCENES_NEXT')
    assert.equal(calls[0].payload.source, 'test')
    assert.equal(calls[1].command, 'SCENES_PAUSE')
    assert.equal(calls[1].payload.scene, 'ignored')
  })
})
