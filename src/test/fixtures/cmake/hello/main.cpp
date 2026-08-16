#include <iostream>

int main(int argc, char** argv) {
  std::cout << "Hello from DevSwitcher CMake fixture";
  for (int i = 1; i < argc; ++i) {
    std::cout << ' ' << argv[i];
  }
  std::cout << '\n';
  return 0;
}
