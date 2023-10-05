const NodeHelper = require('node_helper')
const bodyParser = require('body-parser')
const Log = require('../../js/logger.js')

module.exports = NodeHelper.create({
  start: function () {
    this.expressApp.use(bodyParser.json())
    this.expressApp.use(bodyParser.urlencoded({ extended: true }))

    this.expressApp.get('/scenes/:action', (req, res) => {
      const action = req?.params?.action || null
      if (!action) {
        res.status(400).send({ message: 'Invalid request'})
        return
      }
      Log.log(`[SCENES] Received request: ${action}`)
      switch (action) {
        case 'next':
        case 'prev':
        case 'pause':
        case 'resume':
        case 'play':
          this.sendSocketNotification('ACTION', { command: `SCENES_${action.toUpperCase()}` })
          break
        default:
          this.sendSocketNotification('ACTION', { command: 'SCENES_PLAY', scene: action })
          break
      }
      res.status(200).send({ status: 200 })
      return
    })
  },

  socketNotificationReceived: function (notification, payload) {
    this.sendSocketNotification(notification, payload) // just for check
  }
})