const config = {
  address: '0.0.0.0',
  logLevel: ['INFO', 'LOG', 'WARN', 'ERROR', 'DEBUG'],
  modules: [
    {
      module: 'alert',
    },
    {
      module: 'updatenotification',
      position: 'top_bar',
    },
    {
      module: 'clock',
      position: 'top_left',
      classes: 'CLOCKS FINAL',
      hiddenOnStartup: true,
    },
    {
      module: 'clock',
      position: 'top_right',
      classes: 'CLOCKS CLOCKS_SUB',
      hiddenOnStartup: true,
    },
    {
      module: 'compliments',
      position: 'lower_third',
      classes: 'WELCOME',
      hiddenOnStartup: true,
    },
    {
      module: 'weather',
      position: 'top_right',
      classes: 'FINAL',
      hiddenOnStartup: true,
      config: {
        weatherProvider: 'openmeteo',
        type: 'current',
        lat: 40.776676,
        lon: -73.971321,
      },
    },
    {
      module: 'newsfeed',
      position: 'bottom_bar',
      classes: 'FINAL',
      hiddenOnStartup: true,
      config: {
        feeds: [
          {
            title: 'New York Times',
            url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
          },
        ],
        showSourceTitle: true,
        showPublishDate: true,
      },
    },
    {
      module: 'MMM-Scenes2',
      position: 'bottom_bar',
      config: {
        life: 5000,
        defaultEnter: {
          animation: 'bounceIn',
          duration: 1500,
          gap: 0,
        },
        defaultExit: {
          animation: 'zoomOut',
          duration: 1000,
          gap: 0,
        },
        scenario: [
          {
            name: 'standby',
            life: 5000,
            activeIndicator: ' ',
            inactiveIndicator: ' ',
          },
          {
            name: 'welcome',
            enter: ['WELCOME'],
          },
          {
            name: 'clocks',
            exit: ['WELCOME'],
            enter: [
              {
                role: 'CLOCKS',
                gap: 200,
              },
            ],
          },
          {
            name: 'final',
            exit: [
              {
                role: 'CLOCKS_SUB',
                animation: 'hinge',
              },
            ],
            enter: [
              {
                role: 'FINAL',
                animation: 'fadeInUpBig',
                duration: 2000,
                gap: 200,
              },
            ],
            life: 0,
            activeIndicator: '<span style="color:yellow;font-size:200%">★</span>',
          },
        ],
      },
    },
  ],
}

/** ************* DO NOT EDIT THE LINE BELOW */
if (typeof module !== 'undefined') {
  module.exports = config
}
