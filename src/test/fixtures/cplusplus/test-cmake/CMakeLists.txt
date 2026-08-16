cmake_minimum_required(VERSION 3.15)
project(test-cmake CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(test-cmake main.cpp)
