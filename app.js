/*
 * EN — Back to the crossing
 * I made a quick version in Unity on October 13, 2025, then forgot about it.
 * Almost a year later, I came back and rebuilt the scene with shaders,
 * closer to the original cover. The walkers are still magenta, on purpose.
 *
 * TR — Tekrar yaya geçidinde
 * 13 Ekim 2025'te Unity'de hızlıca bir ilk sürüm yaptım, sonra da unuttum.
 * Neredeyse bir yıl sonra projeye geri dönüp sahneyi shader'larla yeniden kurdum.
 * Bu kez orijinal kapağa daha yakın. Karakterler hâlâ magenta; o kısım bilerek.
 *
 * ES — De vuelta al paso de peatones
 * El 13 de octubre de 2025 hice una primera versión en Unity y luego me olvidé de ella.
 * Casi un año después retomé el proyecto y rehice la escena con shaders,
 * más parecida a la portada original. Los personajes siguen en magenta, a propósito.
 */
const $ = (id) => document.getElementById(id);
const canvas = $('scene');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
const state = { time: 0, paused: matchMedia('(prefers-reduced-motion: reduce)').matches, speed: 1, grain: .35, sun: .55, scale: 1, camera: [0, 0, 0], frames: 0 };
let program, uniforms, environmentProgram, environmentUniforms, framebuffer, targets, vao, previous, renderedKey, backgroundKey, lost = false, renderError = 0;
function fail(error) { $('status').hidden = true; $('error').hidden = false; $('error').textContent = String(error); console.error(error); }
function compile(type, source) { const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(log); } return shader; }
function makeProgram(vertex, source) { const fragment = compile(gl.FRAGMENT_SHADER, source), result = gl.createProgram(); gl.attachShader(result, vertex); gl.attachShader(result, fragment); gl.linkProgram(result); if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result)); gl.deleteShader(fragment); return result; }
function locations(p) { return Object.fromEntries(['uResolution', 'uTime', 'uGrain', 'uSun', 'uCamera'].map(name => [name, gl.getUniformLocation(p, name)])); }
async function init() {
  if (!gl) throw new Error('Could not start WebGL2 in this browser.');
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('This scene needs EXT_color_buffer_float to render to floating-point textures.');
  const sources = await Promise.all(['abbey-road.frag','walkers.frag','common.glsl'].map(async name => {const response=await fetch('shaders/'+name,{cache:'no-store'});if(!response.ok)throw new Error('Shader fetch failed: '+response.status);return response.text();}));
  const vertex=compile(gl.VERTEX_SHADER, '#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}');
  environmentProgram=makeProgram(vertex,sources[0].replace('/* COMMON */',sources[2]).replace('#version 300 es','#version 300 es\n#define DEBUG_STAGE 5\n#define ENVIRONMENT_PASS 1'));
  program=makeProgram(vertex,sources[1].replace('/* COMMON */',sources[2]));gl.deleteShader(vertex);vao=gl.createVertexArray();gl.bindVertexArray(vao);
  environmentUniforms=locations(environmentProgram);uniforms=locations(program);
  gl.useProgram(environmentProgram);gl.uniform2i(gl.getUniformLocation(environmentProgram,'uTrees'),30,11);gl.uniform4i(gl.getUniformLocation(environmentProgram,'uCounts'),17,10,24,18);gl.uniform1i(gl.getUniformLocation(environmentProgram,'uBranches'),3);
  gl.useProgram(program);gl.uniform1i(gl.getUniformLocation(program,'uPeople'),4);gl.uniform1i(gl.getUniformLocation(program,'uBackground'),0);gl.uniform1i(gl.getUniformLocation(program,'uSurface'),1);
  $('status').hidden=true;$('error').hidden=true;lost=false;renderError=0;previous=undefined;renderedKey=undefined;backgroundKey=undefined;updatePlay();resize();requestAnimationFrame(frame);
}
function resize() {const ratio=Math.min(devicePixelRatio,2,640/Math.max(canvas.clientWidth,canvas.clientHeight))*state.scale;canvas.width=Math.max(1,Math.round(canvas.clientWidth*ratio));canvas.height=Math.max(1,Math.round(canvas.clientHeight*ratio));if(!gl||!program)return;
 if(targets)targets.forEach(t=>gl.deleteTexture(t));if(framebuffer)gl.deleteFramebuffer(framebuffer);framebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);targets=[gl.createTexture(),gl.createTexture()];
 targets.forEach((t,i)=>{gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,i?gl.RGBA16F:gl.RGBA8,canvas.width,canvas.height,0,gl.RGBA,i?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0+i,gl.TEXTURE_2D,t,0);});gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('GPU framebuffer incomplete');gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);backgroundKey=undefined;renderedKey=undefined;
}
function setUniforms(u,time){gl.uniform2f(u.uResolution,canvas.width,canvas.height);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uGrain,state.grain);gl.uniform1f(u.uSun,state.sun);gl.uniform3fv(u.uCamera,state.camera);}
function submit(){gl.drawArrays(gl.TRIANGLES,0,3);const error=gl.getError();if(error){renderError=error;lost=true;fail('Could not draw the scene (GL error '+error+'). Rendering has stopped. See the browser console for details.');return false;}return true;}
// EN: If nothing's changed, let it be.
function draw(force=false){if(lost||!uniforms)return;const key=[canvas.width,canvas.height,state.time,state.grain,state.sun,...state.camera].join();if(!force&&key===renderedKey)return;renderedKey=key;
 // EN: Macmillan took six photos; the fifth became the cover. We're a few frames past that.
 // About the cover: https://www.thebeatles.com/abbey-road-anniversary-editions-out-now
 // Update foliage motion at 8 Hz; draw the walkers every animation frame.
 const windTime=Math.floor(state.time*8)/8,bgKey=[canvas.width,canvas.height,windTime,state.sun,...state.camera].join();
 if(force||bgKey!==backgroundKey){gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.useProgram(environmentProgram);setUniforms(environmentUniforms,windTime);if(!submit())return;backgroundKey=bgKey;}
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.useProgram(program);targets.forEach((t,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);});setUniforms(uniforms,state.time);if(!submit())return;state.frames++;
}
function frame(now) { if (lost) return; if (previous !== undefined && !state.paused && !document.hidden) state.time += Math.min((now - previous) / 1000, .1) * state.speed; previous = now; draw(); const seconds = state.time % 60; $('clock').textContent = `${String(Math.floor(state.time / 60)).padStart(2, '0')}:${seconds.toFixed(1).padStart(4, '0')}`; requestAnimationFrame(frame); }
function updatePlay() { $('play').textContent = state.paused ? 'Play' : 'Pause'; $('play').setAttribute('aria-label', state.paused ? 'Play animation' : 'Pause animation'); }
function togglePlay() { state.paused = !state.paused; updatePlay(); }
function reset() { state.time = 0; state.camera = [0, 0, 0]; }
function cinema() { document.body.classList.toggle('cinema'); }
$('play').addEventListener('click', togglePlay); $('reset').addEventListener('click', reset); $('cinema').addEventListener('click', cinema); $('restore').addEventListener('click', cinema);
for (const name of ['speed', 'grain', 'sun']) $(name).addEventListener('input', e => { state[name] = Number(e.target.value); $(`${name}Value`).textContent = name === 'speed' ? `${state.speed.toFixed(1)}\u00d7` : name === 'grain' ? `${Math.round(state.grain * 100)}%` : state.sun < .3 ? 'Low' : state.sun > .7 ? 'High' : 'Afternoon'; });
$('quality').addEventListener('change', e => { state.scale = Number(e.target.value); resize(); });
$('framing').addEventListener('change', e => { document.body.classList.toggle('cover', e.target.value === 'cover'); resize(); });
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { previous = undefined; });
window.addEventListener('keydown', e => { if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if (e.code === 'Space') { e.preventDefault(); togglePlay(); } if (e.key.toLowerCase() === 'r') reset(); if (e.key.toLowerCase() === 'c') cinema(); });
let pointer;
canvas.addEventListener('pointerdown', e => { pointer = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!pointer) return; state.camera[0] = Math.max(-1.2, Math.min(1.2, state.camera[0] + (e.clientX - pointer[0]) * .005)); state.camera[1] = Math.max(-.35, Math.min(.6, state.camera[1] + (e.clientY - pointer[1]) * .003)); pointer = [e.clientX, e.clientY]; });
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { pointer = undefined; });
canvas.addEventListener('wheel', e => { e.preventDefault(); state.camera[2] = Math.max(-2.5, Math.min(1.5, state.camera[2] - e.deltaY * .004)); }, { passive: false });
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; $('status').hidden = false; $('status').textContent = 'Lost the WebGL context. Waiting for it to recover\u2026'; });
canvas.addEventListener('webglcontextrestored', () => { targets=undefined;framebuffer=undefined;init().catch(fail); });
// The smoke check uses these hooks to render at a fixed time and inspect WebGL state.
window.crossing = { state, renderAt(time) { state.paused = true; state.time = time; updatePlay(); draw(true); }, diagnostics() { if (lost || !gl || gl.isContextLost() || !program) return { ...state, ready: false, error: renderError, contextLost: gl?.isContextLost() ?? false }; const ext = gl.getExtension('WEBGL_debug_renderer_info'); return { ...state, ready: true, resolution: [canvas.width, canvas.height], renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), error: gl.getError(), linked: gl.getProgramParameter(program, gl.LINK_STATUS) && gl.getProgramParameter(environmentProgram, gl.LINK_STATUS), passes: 2 }; } };
init().catch(fail);
