#pragma once

#include <memory>

#include "webgpu/webgpu_cpp.h"

#include <RNFHybridObject.h>

#include "RNFJSIConverter.h"

namespace jsi = facebook::jsi;

namespace rnwgpu {
class GPURenderPassColorAttachment {
public:
  wgpu::RenderPassColorAttachment *getInstance() { return &_instance; }

  wgpu::RenderPassColorAttachment _instance;
};
} // namespace rnwgpu

namespace margelo {

template <>
struct JSIConverter<std::shared_ptr<rnwgpu::GPURenderPassColorAttachment>> {
  static std::shared_ptr<rnwgpu::GPURenderPassColorAttachment>
  fromJSI(jsi::Runtime &runtime, const jsi::Value &arg, bool outOfBounds) {
    auto result = std::make_unique<rnwgpu::GPURenderPassColorAttachment>();
    if (!outOfBounds && arg.isObject()) {
      auto value = arg.getObject(runtime);
      if (value.hasProperty(runtime, "view")) {
        auto view = value.getProperty(runtime, "view");

        if (view.isUndefined()) {
          throw std::runtime_error(
              "Property GPURenderPassColorAttachment::view is required");
        }
      } else {
        throw std::runtime_error(
            "Property GPURenderPassColorAttachment::view is not defined");
      }
      if (value.hasProperty(runtime, "depthSlice")) {
        auto depthSlice = value.getProperty(runtime, "depthSlice");
      }
      if (value.hasProperty(runtime, "resolveTarget")) {
        auto resolveTarget = value.getProperty(runtime, "resolveTarget");
      }
      if (value.hasProperty(runtime, "clearValue")) {
        auto clearValue = value.getProperty(runtime, "clearValue");
      }
      if (value.hasProperty(runtime, "loadOp")) {
        auto loadOp = value.getProperty(runtime, "loadOp");

        if (loadOp.isUndefined()) {
          throw std::runtime_error(
              "Property GPURenderPassColorAttachment::loadOp is required");
        }
      } else {
        throw std::runtime_error(
            "Property GPURenderPassColorAttachment::loadOp is not defined");
      }
      if (value.hasProperty(runtime, "storeOp")) {
        auto storeOp = value.getProperty(runtime, "storeOp");

        if (storeOp.isUndefined()) {
          throw std::runtime_error(
              "Property GPURenderPassColorAttachment::storeOp is required");
        }
      } else {
        throw std::runtime_error(
            "Property GPURenderPassColorAttachment::storeOp is not defined");
      }
    }
    // else if () {
    // throw std::runtime_error("Expected an object for
    // GPURenderPassColorAttachment");
    //}
    return result;
  }
  static jsi::Value
  toJSI(jsi::Runtime &runtime,
        std::shared_ptr<rnwgpu::GPURenderPassColorAttachment> arg) {
    // No conversions here
    return jsi::Value::null();
  }
};
} // namespace margelo