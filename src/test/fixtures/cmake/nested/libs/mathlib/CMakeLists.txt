# Library-only sub-project: builds, but must never run/debug (ADR-019).
add_library(mathlib STATIC mathlib.cpp)
target_include_directories(mathlib PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
