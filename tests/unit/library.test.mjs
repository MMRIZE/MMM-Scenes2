import assert from 'node:assert/strict'
import { test } from 'node:test'

const log = { log() {} }
globalThis.Log = log
globalThis.MM = {
  getModules: () => ({
    withClass: () => [],
  }),
}

const { Scenes } = await import('../../library.mjs')

function createModules(modules) {
  return {
    getModules: () => ({
      withClass: role => modules.filter(module => module.classes.includes(role)),
    }),
    hideModule: (module) => {
      module.hidden = true
    },
    showModule: (module) => {
      module.hidden = false
    },
  }
}

test('assigns defaults and one-based automatic scene names', async () => {
  const scenes = new Scenes({
    scenario: [
      {
        enter: ['weather'],
      },
      {},
    ],
    defaults: {
      defaultEnter: {
        animation: 'fadeIn',
        duration: 1000,
        gap: 0,
      },
      defaultExit: {
        animation: 'fadeOut',
        duration: 500,
        gap: 0,
      },
      activeIndicator: 'A',
      inactiveIndicator: 'I',
      life: 0,
    },
  })

  assert.equal(scenes.length, 2)
  assert.deepEqual(scenes.indicators, {
    active: ['A', 'A'],
    inactive: ['I', 'I'],
  })
  assert.equal((await scenes.play('scene_1')).currentScene.name, 'scene_1')
  assert.deepEqual((await scenes.current()).currentScene.enter, [
    {
      role: 'weather',
      animation: 'fadeIn',
      duration: 1000,
      gap: 0,
    },
  ])
})

test('hides exiting roles and shows entering roles', async () => {
  const modules = [
    { classes: ['old'], hidden: false },
    { classes: ['new'], hidden: true },
  ]
  globalThis.MM = createModules(modules)

  const scenes = new Scenes({
    scenario: [{
      exit: ['old'],
      enter: ['new'],
      life: 0,
    }],
    defaults: {
      defaultEnter: { duration: 1, gap: 0 },
      defaultExit: { duration: 1, gap: 0 },
    },
  })

  await scenes.play()

  assert.equal(modules[0].hidden, true)
  assert.equal(modules[1].hidden, false)
})

test('follows named and callback-based branches', async () => {
  let callbackArguments
  const scenes = new Scenes({
    scenario: [
      {
        name: 'A',
        next: ({ scene, scenario }) => {
          callbackArguments = { scene, scenario }
          return 'C'
        },
        life: 0,
      },
      {
        name: 'B',
        life: 0,
      },
      {
        name: 'C',
        previous: 'A',
        life: 0,
      },
    ],
  })

  await scenes.play('A')
  await scenes.next()
  assert.equal((await scenes.current()).currentScene.name, 'C')
  assert.equal(callbackArguments.scene.name, 'A')
  assert.equal(callbackArguments.scenario.length, 3)

  await scenes.previous()
  assert.equal((await scenes.current()).currentScene.name, 'A')
})

test('blocks next and previous when configured as false', async () => {
  const scenes = new Scenes({
    scenario: [{
      name: 'locked',
      next: false,
      previous: false,
      life: 0,
    }],
  })

  await scenes.play('locked')
  const next = await scenes.next()
  const previous = await scenes.previous()

  assert.equal(next.index, 0)
  assert.equal(previous.index, 0)
  assert.equal(next.currentScene.name, 'locked')
})

test('keeps the current scene when a branch target is unknown', async () => {
  const scenes = new Scenes({
    scenario: [
      { name: 'start', next: 'missing', life: 0 },
      { name: 'end', life: 0 },
    ],
  })

  await scenes.play('start')
  const result = await scenes.next()

  assert.equal(result.status, false)
  assert.equal(result.message, 'Target scene not found')
  assert.equal(result.index, 0)
  assert.equal(result.currentScene.name, 'start')
  assert.equal((await scenes.current()).currentScene.name, 'start')
})
