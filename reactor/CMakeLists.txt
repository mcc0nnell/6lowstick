cmake_minimum_required(VERSION 3.20)
project(6lowreactor_observer LANGUAGES C)
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
find_package(Threads REQUIRED)
find_package(Celix REQUIRED)

add_library(low_reactor_core STATIC src/core.c)
target_include_directories(low_reactor_core PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")
set_target_properties(low_reactor_core PROPERTIES POSITION_INDEPENDENT_CODE ON)
target_compile_options(low_reactor_core PRIVATE -Wall -Wextra -Werror)

add_celix_bundle(low_reactor_observer
    VERSION 0.1.0
    SOURCES src/celix_bundle.c
)
target_link_libraries(low_reactor_observer PRIVATE low_reactor_core Threads::Threads)
target_compile_options(low_reactor_observer PRIVATE -Wall -Wextra -Werror)

add_executable(low_reactor_core_test test/core_test.c)
target_link_libraries(low_reactor_core_test PRIVATE low_reactor_core)
add_executable(low_reactor_celix_smoke test/celix_smoke.c)
target_link_libraries(low_reactor_celix_smoke PRIVATE Celix::framework low_reactor_core)

enable_testing()
add_test(NAME reactor_core COMMAND low_reactor_core_test)
add_test(NAME reactor_celix_smoke COMMAND low_reactor_celix_smoke
    "${CMAKE_CURRENT_BINARY_DIR}/low_reactor_observer-$<CONFIG>.zip")
