#include <cstdio>
#include "../mathlib/mathlib.h"

int main(int argc, char** argv) {
    std::printf("vs-demo: 2 + 3 = %d\n", add(2, 3));
    for (int i = 1; i < argc; ++i) {
        std::printf("arg[%d] = %s\n", i, argv[i]);
    }
    return 0;
}
