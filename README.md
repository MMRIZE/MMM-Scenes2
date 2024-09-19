# MMM-Scenes2
> **“Life is a theatre set in which there are but few practicable entrances.”**
>  
> ― Victor Hugo, Les Misérables


MagicMirror module to change screen scenes by time and order with **ANIMATION EFFECT**.

## Demo
[![MMM-Scenes2 Demo & Screenshot](./screenshot.jpg) Click To Play](https://www.youtube.com/watch?v=VgL6rIedXqI)

Click it to see the DEMO.
Its configuration file is in `/examples/config.js.example`

## Successor of `MMM-Scenes`
Since MM 2.25, a new feature, `animateCSS` is introduced into the MagicMirror.

With this update, my previous `MMM-Scenes` would be obsoleted. So I remade a new module for MM 2.25
- The update can provide more effects now. ( without my effort. :D )
- custom animation is rarely used, and this update would cover most use cases. So I decided to drop it.
- I redesigned the structure more simply and intuitively. (`role` is introduced.)

## Concept
The scenario of the MM screen is made up of a series of scenes. Each module has its role in its appearance scenes to enter and exit by design.

When a scene begins, all modules whose roles end will be expelled, and all modules with the parts in that scene will be admitted.

As described in the scenario, your MM screen will play a drama with modules.


## Features
- control show/hide modules by assigning role names to the module's class
- various animations for modules exit/enter
- control scenes by notification and WebURL endpoints.
- Loop control
- custom indicators

## Install
```sh
cd ~/MagicMirror/modules
git clone https://github.com/MMRIZE/MMM-Scenes2
cd MMM-Scenes2
npm install
```

## Configuration
> Don't worry, it's not as difficult as it looks.
> You can find a real-world example in the `examples` directory.
### The simplest example;
```js
{
  module: "clock",
  position: "top_left",
  hiddenOnStart: true,
  classes: "role1 role_final" // <-- assign role(s) to the module to control.
},
// ... other modules ...

{
  module: "MMM-Scenes2",
  position: 'bottom_bar', // Position of indicator
  config: {
    scenario: [ // `scenario` is REQUIRED
      { // First scene definition
        exit: ["role1", "role2"],
        enter: ["role3", "role4"],
      },
      { // Second scene definition
        exit: ["role3"],
        enter: ["role_final"],
      },
    ]
  }
}

```
> This `scenario` has 2 scenes. At the first scene, `"role1"` and `"role2"` module(s) will exit from the scene with default animation. Then `"role3"` and `"role4"` module(s) will enter into the scene. After some lifetime, the second scene will start. `"role3"` module(s) will be disappeared and `"role_final"` scene will be revealed. (`"role4"` will remain at the second scene.) And the whole scenario will repeat.

> In other words, the `clock` module will exit from the first scene as `"role1"` and will enter into the second scene as `"role_final"`.


### Options
```js
config: {
  scenario: [ ... ], // Array of scene objects. This is the only option MUST-REQUIRED. You should fulfil this option in your configuration.

  //Below are omittable. You don't have to describe all these options in your config.
  life: 1000 * 60, // default life of each scene
  activeIndicator: '■', // default indicator of current scene
  inactiveIndicator: '□', // default indicator of other scenes inactive
  // You can ignore the belows if you are not an expert.
  lockString: 'mmm-scenes2', // lockString for hide mechanism
  defaultEnter: { animation, duration, gap }, // convenient definition of default options for `enter`
  defaultExit: { animation, duration, gap }, // convenient definition of default options for `exit`
}
```
|**property**|**default**|**description**|
|---|---|---|
|`scenario`| [] | **REQUIRED** The order-set of scenes. You SHOULD set the scene definition (object) as the items of this property.|
|`life`| 1000 * 60 | (ms) The life of each scene after all roles are appeared. After this time, the next scene would start. <br> If set as `0`, the scene would be paused unless external control(notification, telegram, ...) happens.|
|`activeIndicator`|'■'| Default indicator of current active scene. You can reassign it in each scene object. |
|`inactiveIndicator`|'□'| Default indicator of other inactive scenes. This could also be reassigned in each scene object. |
|`lockString`|'mmm-scenes2'| Just leave it if you don't know what this is for. |
|`defaultEnter`| { animation, duration, gap } | Convenient definition of default options for `enter`. I'll explain later. |
|`defaultExit`| { animation, duration, gap } | Convenient definition of default options for `exit`. I'll explain later. |

> There is no `defaultNext` or `defaultPrevious` because `next` and `previous` should differ according to the scene.

### `scene` Object in `scenario`
`scenario` would have some series of `scene` objects. Each object would have these structures.
```js
scenario: [
  {
    enter: [ ... ],
    exit: [ ... ],
    name: 'first_scene',
    life: 1000 * 30,
    activeIndicator: '■',
    inactiveIndicator: '□',
    next: null, // Since 1.1.0
    previous: null, // Since 1.1.0
  },
  // next scenes.
]
```
- When you don't assign `name` by yourself, `scene_N`(scene_0, scene_1, ...) would be set automatically. This name would be used for external control, so it would be better to avoid `prev`, `next`, `pause`, `resume`, `play` as a scene name.
- `life`, `activeIndicator`, `inactiveIndicator` are defined in global configuration, but they could be reassigned in the specific `scene` object by your needs.
- When `life` is set as `0`, this scene would stop until an external command arrives. (e.g. TelegramBot command). You can set this value as `0` on the last scene to play the scenario only once.
- **(new)** `next` and `previous` is introduced since 1.1.0. The 2 fields would be used for control the order of scenes. It'll be explained later.
- `enter` and `exit` are the most important fields on `scene` object. See below.
### `enter/exit` Objects in `scene`
```js
scenario: [
  {
    enter: [ "role1", "role2", ... ],
    // OR
    enter: [
      {
        role: "role1",
        animation: "bounceIn",
        duration: 1500,
        gap: 100,
      },
      {
        role: "role2",
        animation: "rotateIn",
      }
    ],
    // OR
    enter: [ 
      "role1",
      {
        role: "role2",
        animation: "flipInY",
        duration: 3000,
      }
    ]
    // ... other fields
  }
  // ... more
],
```
Each `enter` and `exit` could have a list of roles. `role` could be the name which you assigned in `classes` of modules, or the object which has a definition of the role, or a mix of names and objects.

When you don't need to order different behaviours to the specific roles in the scene, the names are enough to direct which module will enter/exit.

- `role`: the name of role-player module(s). 
- `animation`: the name of animation. Currently, the possible animations are defined [here](https://github.com/MagicMirrorOrg/MagicMirror/blob/master/js/animateCSS.js). Or see [this](https://animate.style/)
- `duration`: Speed of animation
- `gap`: Each role module transitions sequentially with this delay. If set as 0, all modules of this role start their transition simultaneously.

For your convenience, You can define `defaultEnter` and `defaultExit` for the common setting of all roles unless each value is reassigned in the specific scene.
```js
config: {
  defaultEnter: {
    animation: 'fadeIn',
    duration: 1000,
    gap: 0,
  },
  defaultExit: {
    animation: 'fadeOut',
    duration: 1000,
    gap: 0,
  },
  scenario: [ ... ],
  ...
}
```

### `previous/next` in `scene` (since 1.1.0)
By default, the order of the scenes is linearly executed in the order listed in `scenario:[...]`. For example, The third scene is executed after the second scene, and so on.

However, there are cases where you may want to arbitrarily adjust the order of the scenes.

- `previous/next` is used to force the previous and next scenes in each scene, respectively. The possible kind of values ​​are `(sceneIndex)`, `(sceneName)`, `null`, `false`, or `the callback function` which will return one of those values. 
```js
scenario: [ 
...
  { 
    name: "scene_003",
    exit: ["role1", "role2"],
    enter: ["role3", "role4"],
    next: "scene_005", // sceneName
    previous: 2, // Or sceneIndex
  },
...
```
This example means; the next scene of the this scene would be `"scene_005"`. And when `SCENE_PREV` is called, the previous of this scene would be the 3rd scene of the scenranio. (`2` means `3rd` because index would be zero-based.)

- If you want to follow the original order in the scenrio, just omit `next`/`previous` or set it as `null`. (Default behaviours)

- If you set it to `false`, the flow would be blocked. `next: false` means, you cannot forward anywhere from this scene. 

```js
next: false,
previous: false,
```
This example means; `SCENE_PREV` or `SCENE_NEXT` will not work once you enter this scene. (but you can escape with `SCENE_PLAY` by force) 

- Finally, instead of a static value, you can use a callback function to provide a value that changes dynamically depending on a condition. This can be useful when branching of the scenario is required.
```js
next: ({ scene, scenario }) => {
  // A Parameter `scene` would have the info of current scene.
  // A parameter `scenario` would have the whole scenario information.
  // console.log(scene, scenario)
  return (Math.random() > 0.5) ? "scene_001" : "scene_002"
}
```
This example shows, the next scene would be randomly selected between "scene_001" and "scene_002". Of course, you can program it for your purpose. (For example; `Normal scenario / Party scenario by time`, ...)

More detailed examples are in the [wiki](https://github.com/MMRIZE/MMM-Scenes2/wiki).

## External Controls
> Some syntax was changed from `MMM-Scenes`. Check it carefully if you are a user of the previous module.
### Incoming notifications
- Each incoming notification could have a `callback` function as a member of the payload. It will be called when your notification request is done.
```js
this.sendNotification('SCENE_NEXT', {
  callback: (result) => { console.log(result.status) }
})

// Callback result example
 {
  status: true,
  currentScene: { name, enter, exit, ... },
  index: 0,
  message: "Example..."
}
```
#### `SCENES_NEXT`, payload: { callback }
Play the next scene.

#### `SCENES_PREV`, payload: { callback, }
Play the previous scene.

#### `SCENES_PAUSE`, payload: { callback }
Pause at current scene until another command comming.

#### `SCENES_RESUME`, payload: { callback }
Resume the scene. The remaining life at pause would be applied with this command. 
You can also resume with other commands(e.g. `SCENES_NEXT`). In that case, the remaining life would be ignored, and the scene would play instantly.

#### `SCENES_CURRENT`, payload: { callback }
Get information on the current scene.

#### `SCENES_PLAY`, payload: { callback, scene }
Play a specific scene.
`scene` could be a name or an index of a scene in the scenario. If omitted, the current scene would be applied.

### Outgoing Notification
#### `SCENES_CHANGED`, payload: { info }
When scenes are changed, this notification will be emitted.

### WebAPI Endpoint
You can access MM URL to control this module from outside of MM. e.g.) IFTTT.
```
http://magicmirror.domain/scenes/pause
http://magicmirror.domain/scenes/resume
http://magicmirror.domain/scenes/next
http://magicmirror.domain/scenes/prev
http://magicmirror.domain/scenes/0
http://magicmirror.domain/scenes/scene_2
```

### MMM-TelegramBot Integration
You can control MMM-Scenes2 using the Telegram app by installing the [MMM-TelegramBot](https://github.com/MMRIZE/MMM-TelegramBot) module.

- `/scene info`
- `/scene pause`
- `/scene resume`
- `/scene next`
- `/scene prev`
- `/scene index:0`
- `/scene name:scene_2`

## Indicators
You can assign indicators globally or scene-specifically. 
```js
config: {
  activeIndicator: '■',
  inactiveIndicator: '□',
  scenario: [ ... ],
  ...
}
```
If you have 4 scenes in the scenario, the indicator will be shown as `□ ■ □ □`(the second scene is active).

```js
config: {
  ...
  scenario: [
    { // First scene
      activeIndicator: '❶',
      inactiveIndicator: '①',
      ...
    },
    ...
  ]
}
```
Like this, you can reassign indicators for specific scenes. In this case, you can see `❶ □ □ □` or `① ■ □ □`.


You can decorate the indicators with CSS in your `custom.css`; The structure of HTML created will be like this
```html
<div class="scenes_indicator">
  <span class="scenes_indicator_scene index_0 inactive first">□</span>
  <span class="scenes_indicator_scene index_1 active">■</span> <!-- current scene -->
  <span class="scenes_indicator_scene index_2 inactive last">□</span>
</div>
```
You can decorate its look like this;
```css
/* custom.css */
.scenes_indicator_scene.inactive {
  color: gray;
}

.scenes_indicator_scene.active {
  color: red;
  font-weight: bold;
  font-size: 200%;
}
```

One more thing: You can change the scene by clicking/touching the indicator if your MM supports click/touch.

## Tips & ETC
- I dropped out some features of `MMM-Scenes` like `customized animation` or some things in this module. If you need to implement it again, feel free to tell me. I'll consider it.
- If the `life` of a scene is set as `0`, that scene will not be forwarded to the next scene. You can use this feature to make control looping or some hidden scenes for specific purposes.
- RPI3 or older/weaker SBC doesn't have enough power to handle the animation. In that case, use animation default or avoid serious effects.


## History
### 1.1.0 (2024-08-09)
- `next` / `previous` for branching scenario (even on-fly-time)
- Code cleaning
  
### 1.0.0 (2023-10-05)
- Released

### Author
- Seongnoh Yi (eouia0819@gmail.com)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Y8Y56IFLK)
