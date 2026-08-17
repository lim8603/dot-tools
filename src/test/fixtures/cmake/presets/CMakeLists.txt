cmake_minimum_required(VERSION 3.21)
project(preset-demo LANGUAGES CXX)

# Minimal executable fixture for exercising the DevSwitcher CMakePresets flow (TASK-041):
# the Preset chip reads CMakePresets.json and `cmake --preset <name>` drives configure.
add_executable(preset-demo main.cpp)
