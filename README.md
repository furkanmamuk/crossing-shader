# Crossing

Four magenta walkers crossing Abbey Road, drawn with shaders.

**[Open the live demo](https://furkanmamuk.github.io/crossing-shader/)**

The street, trees, parked cars and walkers are all generated with GPU shaders. There are no imported models, sprites, photos or texture maps. The whole thing runs in the browser with HTML, CSS, JavaScript and GLSL.

## How it started

I put together a quick version in Unity on October 13, 2025, then forgot about it. Almost a year later, I came back to it and rebuilt the scene with shaders, closer to the original cover.

The walkers are still magenta. That's intentional. :D

There are a few comments tucked into the source in English, Turkish and Spanish. You'll find them in `app.js` and the shaders.

## Try it

- **Space:** play or pause
- **R:** reset time and camera
- **C:** hide or show controls
- **Drag:** shift the camera
- **Scroll:** zoom

The controls let you adjust speed, film grain, sunlight and render quality, or switch between square and wide framing. If you prefer reduced motion, the scene starts paused. The clock also stops while the tab is hidden.

To run locally, serve this folder with any static web server. For example:

```sh
python -m http.server 8765
```

Then open <http://localhost:8765/> in a browser that supports WebGL2 and `EXT_color_buffer_float`. Use the server URL rather than opening `index.html` directly so the browser can fetch the shader files.

## Under the hood

The scene is drawn in two GPU passes, each using a fullscreen triangle. The first finds where each view ray hits the street, buildings, trees and cars. It stores colour, hit distance and material ID in render targets. The second uses those results to add the walkers, their shadows and film grain. The walkers are built from signed-distance shapes. There are no scene vertex buffers or imported image assets.

The background updates at 8 Hz to keep the leaves moving, while the walkers update every animation frame. If nothing has changed, the app skips drawing that frame. Draft, Standard and Fine limit the longest render dimension to 416, 640 and 960 pixels, respectively.

The camera only moves a little: the walkers are flat profiles placed in world space, and the lighting and tree shadows are approximations. It's a stylized version of the scene.

## Checks and hosting

GitHub Actions checks the JavaScript syntax and opens the app at a path like `/crossing-shader/`. It checks that the shaders compile, all four magenta walkers appear, rendering the same paused frame gives the same result, and advancing time changes the image. If the checks pass, it deploys the static files to GitHub Pages. The browser used for these checks renders in software, so the results don't tell you how fast it runs on a GPU.

## About the cover

Iain Macmillan took six photos of the crossing on August 8, 1969; the fifth became the cover. Abbey Road was the last album the four recorded together, but Let It Be was released later. You can read more in [The Beatles' account of the session](https://www.thebeatles.com/abbey-road-anniversary-editions-out-now).

This is a personal fan experiment inspired by that photograph.
