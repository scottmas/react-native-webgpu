/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-shadow */
import React from "react";
import { StyleSheet, View } from "react-native";
import { Canvas } from "react-native-wgpu";
import { mat4, vec3 } from "wgpu-matrix";

import { useWebGPU } from "../components/useWebGPU";
import { fetchAsset } from "../components/useAssets";
import { createSphereMesh, SphereLayout } from "../components/meshes/sphere";
import { meshWGSL } from "../Cube/Shaders";

export const RenderBundles = () => {
  const ref = useWebGPU(
    async ({ device, presentationFormat, canvas, context }) => {
      const settings = {
        asteroidCount: 4000,
      };

      context.configure({
        device,
        format: presentationFormat,
        alphaMode: "premultiplied",
      });

      const shaderModule = device.createShaderModule({
        code: meshWGSL,
      });

      const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: shaderModule,
          buffers: [
            {
              arrayStride: SphereLayout.vertexStride,
              attributes: [
                {
                  // position
                  shaderLocation: 0,
                  offset: SphereLayout.positionsOffset,
                  format: "float32x3",
                },
                {
                  // normal
                  shaderLocation: 1,
                  offset: SphereLayout.normalOffset,
                  format: "float32x3",
                },
                {
                  // uv
                  shaderLocation: 2,
                  offset: SphereLayout.uvOffset,
                  format: "float32x2",
                },
              ],
            },
          ],
        },
        fragment: {
          module: shaderModule,
          targets: [
            {
              format: presentationFormat,
            },
          ],
        },
        primitive: {
          topology: "triangle-list",

          // Backface culling since the sphere is solid piece of geometry.
          // Faces pointing away from the camera will be occluded by faces
          // pointing toward the camera.
          cullMode: "back",
        },

        // Enable depth testing so that the fragment closest to the camera
        // is rendered in front.
        depthStencil: {
          depthWriteEnabled: true,
          depthCompare: "less",
          format: "depth24plus",
        },
      });

      const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      const uniformBufferSize = 4 * 16; // 4x4 matrix
      const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      // Fetch the images and upload them into a GPUTexture.
      // Fetch the images and upload them into a GPUTexture.
      let planetTexture: GPUTexture;
      {
        const response = await fetchAsset(require("../assets/saturn.png"));
        const imageBitmap = await createImageBitmap(await response.blob());

        planetTexture = device.createTexture({
          size: [imageBitmap.width, imageBitmap.height, 1],
          format: "rgba8unorm",
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });
        device.queue.copyExternalImageToTexture(
          { source: imageBitmap },
          { texture: planetTexture },
          [imageBitmap.width, imageBitmap.height],
        );
      }

      let moonTexture: GPUTexture;
      {
        const response = await fetchAsset(require("../assets/moon.png"));
        const imageBitmap = await createImageBitmap(await response.blob());

        moonTexture = device.createTexture({
          size: [imageBitmap.width, imageBitmap.height, 1],
          format: "rgba8unorm",
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });
        device.queue.copyExternalImageToTexture(
          { source: imageBitmap },
          { texture: moonTexture },
          [imageBitmap.width, imageBitmap.height],
        );
      }

      const sampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
      });

      // Helper functions to create the required meshes and bind groups for each sphere.
      function createSphereRenderable(
        radius: number,
        widthSegments = 32,
        heightSegments = 16,
        randomness = 0,
      ) {
        const sphereMesh = createSphereMesh(
          radius,
          widthSegments,
          heightSegments,
          randomness,
        );

        // Create a vertex buffer from the sphere data.
        const vertices = device.createBuffer({
          size: sphereMesh.vertices.byteLength,
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
        new Float32Array(vertices.getMappedRange()).set(sphereMesh.vertices);
        vertices.unmap();

        const indices = device.createBuffer({
          size: sphereMesh.indices.byteLength,
          usage: GPUBufferUsage.INDEX,
          mappedAtCreation: true,
        });
        new Uint16Array(indices.getMappedRange()).set(sphereMesh.indices);
        indices.unmap();

        return {
          vertices,
          indices,
          indexCount: sphereMesh.indices.length,
          bindGroup: null as null | GPUBindGroup,
        };
      }

      function createSphereBindGroup(
        texture: GPUTexture,
        transform: Float32Array,
      ): GPUBindGroup {
        const uniformBufferSize = 4 * 16; // 4x4 matrix
        const uniformBuffer = device.createBuffer({
          size: uniformBufferSize,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          mappedAtCreation: true,
        });
        new Float32Array(uniformBuffer.getMappedRange()).set(transform);
        uniformBuffer.unmap();

        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(1),
          entries: [
            {
              binding: 0,
              resource: {
                buffer: uniformBuffer,
              },
            },
            {
              binding: 1,
              resource: sampler,
            },
            {
              binding: 2,
              resource: texture.createView(),
            },
          ],
        });

        return bindGroup;
      }

      const transform = mat4.create();
      mat4.identity(transform);

      // Create one large central planet surrounded by a large ring of asteroids
      const planet = createSphereRenderable(1.0);
      planet.bindGroup = createSphereBindGroup(planetTexture, transform);

      const asteroids = [
        createSphereRenderable(0.01, 8, 6, 0.15),
        createSphereRenderable(0.013, 8, 6, 0.15),
        createSphereRenderable(0.017, 8, 6, 0.15),
        createSphereRenderable(0.02, 8, 6, 0.15),
        createSphereRenderable(0.03, 16, 8, 0.15),
      ];

      const renderables = [planet];

      function ensureEnoughAsteroids() {
        for (let i = renderables.length; i <= settings.asteroidCount; ++i) {
          // Place copies of the asteroid in a ring.
          const radius = Math.random() * 1.7 + 1.25;
          const angle = Math.random() * Math.PI * 2;
          const x = Math.sin(angle) * radius;
          const y = (Math.random() - 0.5) * 0.015;
          const z = Math.cos(angle) * radius;

          mat4.identity(transform);
          mat4.translate(transform, [x, y, z], transform);
          mat4.rotateX(transform, Math.random() * Math.PI, transform);
          mat4.rotateY(transform, Math.random() * Math.PI, transform);
          renderables.push({
            ...asteroids[i % asteroids.length],
            bindGroup: createSphereBindGroup(moonTexture, transform),
          });
        }
      }
      ensureEnoughAsteroids();

      const renderPassDescriptor: GPURenderPassDescriptor = {
        // @ts-expect-error
        colorAttachments: [
          {
            view: undefined, // Assigned later

            clearValue: [0, 0, 0, 1],
            loadOp: "clear",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: depthTexture.createView(),

          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      };

      const aspect = canvas.width / canvas.height;
      const projectionMatrix = mat4.perspective(
        (2 * Math.PI) / 5,
        aspect,
        1,
        100.0,
      );
      const modelViewProjectionMatrix = mat4.create();

      const frameBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: {
              buffer: uniformBuffer,
            },
          },
        ],
      });

      function getTransformationMatrix() {
        const viewMatrix = mat4.identity();
        mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
        const now = Date.now() / 1000;
        // Tilt the view matrix so the planet looks like it's off-axis.
        mat4.rotateZ(viewMatrix, Math.PI * 0.1, viewMatrix);
        mat4.rotateX(viewMatrix, Math.PI * 0.1, viewMatrix);
        // Rotate the view matrix slowly so the planet appears to spin.
        mat4.rotateY(viewMatrix, now * 0.05, viewMatrix);

        mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

        return modelViewProjectionMatrix;
      }

      // Render bundles function as partial, limited render passes, so we can use the
      // same code both to render the scene normally and to build the render bundle.
      function renderScene(
        passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder,
      ) {
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, frameBindGroup);

        // Loop through every renderable object and draw them individually.
        // (Because many of these meshes are repeated, with only the transforms
        // differing, instancing would be highly effective here. This sample
        // intentionally avoids using instancing in order to emulate a more complex
        // scene, which helps demonstrate the potential time savings a render bundle
        // can provide.)
        let count = 0;
        for (const renderable of renderables) {
          passEncoder.setBindGroup(1, renderable.bindGroup!);
          passEncoder.setVertexBuffer(0, renderable.vertices);
          passEncoder.setIndexBuffer(renderable.indices, "uint16");
          passEncoder.drawIndexed(renderable.indexCount);

          if (++count > settings.asteroidCount) {
            break;
          }
        }
      }

      // The render bundle can be encoded once and re-used as many times as needed.
      // Because it encodes all of the commands needed to render at the GPU level,
      // those commands will not need to execute the associated JavaScript code upon
      // execution or be re-validated, which can represent a significant time savings.
      //
      // However, because render bundles are immutable once created, they are only
      // appropriate for rendering content where the same commands will be executed
      // every time, with the only changes being the contents of the buffers and
      // textures used. Cases where the executed commands differ from frame-to-frame,
      // such as when using frustrum or occlusion culling, will not benefit from
      // using render bundles as much.
      const renderBundleEncoder = device.createRenderBundleEncoder({
        colorFormats: [presentationFormat],
        depthStencilFormat: "depth24plus",
      });
      renderScene(renderBundleEncoder);
      const renderBundle = renderBundleEncoder.finish();

      console.log("update render bundle");
      function frame() {
        const transformationMatrix = getTransformationMatrix();
        device.queue.writeBuffer(
          uniformBuffer,
          0,
          transformationMatrix.buffer,
          transformationMatrix.byteOffset,
          transformationMatrix.byteLength,
        );
        // @ts-expect-error
        renderPassDescriptor.colorAttachments[0].view = context
          .getCurrentTexture()
          .createView();

        const commandEncoder = device.createCommandEncoder();
        const passEncoder =
          commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.executeBundles([renderBundle]);
        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);
      }
      return frame;
    },
  );
  return (
    <View style={style.container}>
      <Canvas ref={ref} style={style.webgpu} />
    </View>
  );
};

const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  webgpu: {
    flex: 1,
  },
});
