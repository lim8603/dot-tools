#include <iostream>

int main() {
    std::cout << "Hello from test-cmake!" << std::endl;

    while (1)
    {
        auto key = ' ';
        std::cin >> key;

        if (key == 'c')
            break;
    }

    return 0;
}
