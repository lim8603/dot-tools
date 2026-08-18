# Executable sub-project (no project() — the VS-solution-style add_subdirectory leaf).
add_executable(nested-app main.cpp)
target_link_libraries(nested-app PRIVATE mathlib)
