#include <iostream>

// Prints an identifying line plus any run args, so Run/Debug output is recognizable and
// argument passing (config.runArgs) is visible when driven through a preset.
int main(int argc, char** argv) {
    std::cout << "Hello from DevSwitcher CMakePresets demo";
    for (int i = 1; i < argc; ++i) {
        std::cout << ' ' << argv[i];
    }
    std::cout << std::endl;
    return 0;
}
