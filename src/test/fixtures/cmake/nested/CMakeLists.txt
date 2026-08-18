cmake_minimum_required(VERSION 3.20)
project(nested-demo CXX)

# F5 fixture for nested sub-projects (MS-021 / ADR-019): the root declares no target of
# its own — targets live in add_subdirectory dirs, so the switcher shows this root with
# three indented sub-projects (two executables, one static library).
add_subdirectory(libs/mathlib)
add_subdirectory(app)
add_subdirectory(tools/cli)
