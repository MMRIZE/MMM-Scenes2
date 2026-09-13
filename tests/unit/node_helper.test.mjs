import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import Module from 'node:module'
import { describe, it } from 'node:test'

const require = createRequire(import.meta.url)
const helperPath = require.resolve('../../node_helper.js')

function loadHelper() {
  const originalLoad = Module._load
  Module._load = function mockLoad(request, parent, isMain) {
    if (request === 'node_helper') {
      return {
        create: definition => definition,
      }
    }
    if (request === '../../js/logger.js') {
      return { log() {} }
    }
    return originalLoad.call(this, request, parent, isMain)
  }

  delete require.cache[helperPath]
  try {
    return require(helperPath)
  }
  finally {
    Module._load = originalLoad
    delete require.cache[helperPath]
  }
}

function createResponse() {
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      response.statusCode = code
      return response
    },
    send(body) {
      response.body = body
      return response
    },
  }
  return response
}

async function request(route, action) {
  const response = createResponse()
  await route({ params: { action } }, response)
  return response
}

describe('node helper HTTP routes', () => {
  it('maps HTTP actions to socket commands', async () => {
    const helper = loadHelper()
    const notifications = []
    let route
    helper.expressApp = {
      get: (path, handler) => {
        route = { path, handler }
      },
    }
    helper.sendSocketNotification = (...args) => {
      notifications.push(args)
    }

    helper.start()
    const response = await request(route.handler, 'pause')

    assert.equal(route.path, '/scenes/:action')
    assert.deepEqual(notifications, [['ACTION', { command: 'SCENES_PAUSE' }]])
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, { status: 200 })
  })

  it('forwards unknown actions as scene names', async () => {
    const helper = loadHelper()
    const notifications = []
    let route
    helper.expressApp = {
      get: (_path, handler) => {
        route = handler
      },
    }
    helper.sendSocketNotification = (...args) => {
      notifications.push(args)
    }

    helper.start()
    await request(route, 'scene_2')

    assert.deepEqual(notifications, [['ACTION', {
      command: 'SCENES_PLAY',
      scene: 'scene_2',
    }]])
  })

  it('rejects requests without an action', async () => {
    const helper = loadHelper()
    let route
    helper.expressApp = {
      get: (_path, handler) => {
        route = handler
      },
    }
    helper.sendSocketNotification = () => {
      throw new Error('should not send a notification')
    }

    helper.start()
    const response = createResponse()
    await route({ params: {} }, response)

    assert.equal(response.statusCode, 400)
    assert.deepEqual(response.body, { message: 'Invalid request' })
  })
})
