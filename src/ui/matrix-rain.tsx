'use client'

import { useEffect, useRef } from 'react'

const MatrixRainBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const gl = canvas.getContext('webgl')

    if (!gl) {
      console.error('WebGL not supported')
      return
    }

    // Vertex shader
    const vertexShaderSource = `
      attribute vec3 position;
      void main() {
          gl_Position = vec4(position, 1.0);
      }
    `

    // Fragment shader
    const fragmentShaderSource = `
      precision mediump float;

      // Configurations
      const float LETTER_SCALE = 0.9;
      const float LETTER_OFFSET = 0.1;
      const float LETTER_RANDOM_SPEED = 0.002;
      const float RAIN_BASE_SPEED = 0.2;
      const float RAIN_SPEED_VARIATION = 0.2;
      const vec3 RAIN_COLOR = vec3(0.694, 0.398, 0.0); // HSL: 32 100% 35% (darker accent)

      uniform float iTime;
      uniform vec2 iResolution;
      uniform sampler2D iChannel0;
      uniform sampler2D iChannel1;

      float text(vec2 fragCoord)
      {
          vec2 uv = mod(fragCoord.xy, 16.0) * 0.0625;
          vec2 block = fragCoord * 0.0625 - uv;
          uv = uv * LETTER_SCALE + LETTER_OFFSET; // scale the letters up
          uv += floor(texture2D(iChannel1, block / iResolution + iTime * LETTER_RANDOM_SPEED).xy * 16.0);
          uv *= 0.0625;
          uv.x = -uv.x;
          return texture2D(iChannel0, uv).r;
      }

      vec3 rain(vec2 fragCoord)
      {
          fragCoord.x -= mod(fragCoord.x, 16.0);

          float offset = sin(fragCoord.x * 20.0);
          float speed = cos(fragCoord.x * 3.0) * RAIN_SPEED_VARIATION + RAIN_BASE_SPEED;

          float y = fract(fragCoord.y / iResolution.y + iTime * speed + offset);
          return RAIN_COLOR / (y * 20.0);
      }

      void main(void)
      {
          vec2 fragCoord = gl_FragCoord.xy;
          gl_FragColor = vec4(text(fragCoord) * rain(fragCoord), 1.0);
      }
    `

    // Compile shader
    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error compiling shader:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER)
    const fragmentShader = compileShader(
      fragmentShaderSource,
      gl.FRAGMENT_SHADER
    )

    if (!vertexShader || !fragmentShader) {
      return
    }

    // Create program
    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.bindAttribLocation(program, 0, 'position')
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Error linking program:', gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      return
    }

    gl.useProgram(program)

    // Define fullscreen quad
    const vertices = new Float32Array([
      -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, 1.0, 0.0,
    ])

    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    // Enable attribute
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)

    // Uniform locations
    const timeLocation = gl.getUniformLocation(program, 'iTime')
    const resolutionLocation = gl.getUniformLocation(program, 'iResolution')
    const channel0Location = gl.getUniformLocation(program, 'iChannel0')
    const channel1Location = gl.getUniformLocation(program, 'iChannel1')

    // Load textures
    const loadTexture = (url: string) => {
      const texture = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, texture)

      // Temporary 1x1 pixel while image loads
      const pixel = new Uint8Array([0, 0, 0, 255])
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixel
      )

      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.src = url
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image
        )
        gl.generateMipmap(gl.TEXTURE_2D)
      }

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
      )
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

      return texture
    }

    // Replace with actual texture URLs or data
    const texture0 = loadTexture('/textures/texture0.png') // iChannel0
    const texture1 = loadTexture('/textures/texture1.png') // iChannel1

    // Set texture units
    gl.uniform1i(channel0Location, 0) // GL_TEXTURE0
    gl.uniform1i(channel1Location, 1) // GL_TEXTURE1

    // Animation loop
    const startTime = performance.now()
    const render = () => {
      const currentTime = performance.now()
      const elapsedTime = (currentTime - startTime) / 1000.0

      // Resize canvas if needed
      if (
        canvas.width !== canvas.clientWidth ||
        canvas.height !== canvas.clientHeight
      ) {
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      }

      // Set uniforms
      gl.uniform1f(timeLocation, elapsedTime)
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height)

      // Bind textures
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, texture1)

      // Draw
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      requestAnimationFrame(render)
    }

    requestAnimationFrame(render)

    // Cleanup on unmount
    return () => {
      gl.deleteBuffer(vertexBuffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      gl.deleteTexture(texture0)
      gl.deleteTexture(texture1)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  )
}

export default MatrixRainBackground
