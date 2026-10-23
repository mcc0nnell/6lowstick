# Copyright 2026 Robert McConnell
# SPDX-License-Identifier: Apache-2.0
# Use with OpenThread -DOT_CLI_VENDOR_EXTENSION=/absolute/path/this/file
# Upstream OpenThread sources are never modified.
get_filename_component(SIXS_BANG_ROOT "${CMAKE_CURRENT_LIST_DIR}/.." ABSOLUTE)
find_package(OpenSSL 1.1.1 REQUIRED COMPONENTS Crypto)
add_library(sixs-bang-ot-vendor STATIC
    "${SIXS_BANG_ROOT}/src/lowbang.c"
    "${SIXS_BANG_ROOT}/src/lowbang_wire.c"
    "${SIXS_BANG_ROOT}/src/lowbang_ot.c"
    "${CMAKE_CURRENT_LIST_DIR}/vendor.c"
)
target_compile_features(sixs-bang-ot-vendor PRIVATE c_std_11)
if(CMAKE_C_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(sixs-bang-ot-vendor PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()
target_include_directories(sixs-bang-ot-vendor PUBLIC
    "${SIXS_BANG_ROOT}/include"
    ${OT_PUBLIC_INCLUDES}
)
target_link_libraries(sixs-bang-ot-vendor PUBLIC OpenSSL::Crypto ot-config)
target_compile_definitions(ot-config INTERFACE
    OPENTHREAD_CONFIG_CLI_MAX_USER_CMD_ENTRIES=4
)
set(OT_CLI_VENDOR_TARGET sixs-bang-ot-vendor)
