#pragma once

#include <memory>

#include "webgpu/webgpu_cpp.h"

#include <RNFHybridObject.h>

#include "RNFJSIConverter.h"

namespace jsi = facebook::jsi;

namespace rnwgpu {
class GPUComputePipelineDescriptor {
public:
  wgpu::ComputePipelineDescriptor *getInstance() { return &_instance; }

  wgpu::ComputePipelineDescriptor _instance;
};
} // namespace rnwgpu

namespace margelo {

template <>
struct JSIConverter<std::shared_ptr<rnwgpu::GPUComputePipelineDescriptor>> {
  static std::shared_ptr<rnwgpu::GPUComputePipelineDescriptor>
  fromJSI(jsi::Runtime &runtime, const jsi::Value &arg, bool outOfBounds) {
    auto result = std::make_unique<rnwgpu::GPUComputePipelineDescriptor>();
    if (!outOfBounds && arg.isObject()) {
      auto value = arg.getObject(runtime);
      if (value.hasProperty(runtime, "compute")) {
        auto compute = value.getProperty(runtime, "compute");

        if (compute.isUndefined()) {
          throw std::runtime_error(
              "Property GPUComputePipelineDescriptor::compute is required");
        }
      } else {
        throw std::runtime_error(
            "Property GPUComputePipelineDescriptor::compute is not defined");
      }
    }
    // else if () {
    // throw std::runtime_error("Expected an object for
    // GPUComputePipelineDescriptor");
    //}
    return result;
  }
  static jsi::Value
  toJSI(jsi::Runtime &runtime,
        std::shared_ptr<rnwgpu::GPUComputePipelineDescriptor> arg) {
    // No conversions here
    return jsi::Value::null();
  }
};
} // namespace margelo