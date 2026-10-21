// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Reviewable standalone synthetic HDLClite parser used as Rizzer's NATIVE target.
// It is NOT the JavaScript parser and neither reads an RCP nor opens a socket.
// The independent cross-language replay explicitly tests JS behavior.
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <vector>
#ifdef RIZZER_SPINEL_ORACLE
#include <fstream>
#include <iostream>
#include <iterator>
#endif

namespace {
constexpr size_t kMaxFrame = 2048;
constexpr size_t kMaxInput = 4096;
struct Frame {
    size_t bytes = 0;
    bool truncated = false;
    bool crcVerified = false;
    bool headerValid = false;
    int header = -1;
    int commandId = -1;
};
uint16_t fcs(const uint8_t *data, size_t len) {
    uint16_t value = 0xffff;
    for (size_t i = 0; i < len; ++i) {
        value ^= data[i];
        for (int bit = 0; bit < 8; ++bit)
            value = static_cast<uint16_t>((value >> 1) ^ ((value & 1) ? 0x8408 : 0));
    }
    return static_cast<uint16_t>(value ^ 0xffff);
}
int commandId(const std::vector<uint8_t>& data, size_t bodySize) {
    uint32_t value = 0;
    for (size_t i = 0; i < 3 && i + 1 < bodySize; ++i) {
        const uint8_t b = data[i + 1];
        value |= static_cast<uint32_t>(b & 0x7f) << (7 * i);
        if (!(b & 0x80)) {
            if (i && value < (1u << (7 * i))) return -1;
            return static_cast<int>(value);
        }
    }
    return -1;
}
std::vector<Frame> parse(const uint8_t *input, size_t len) {
    std::vector<Frame> result;
    std::vector<uint8_t> buffer;
    bool started = false, escaped = false, overflow = false;
    auto flush = [&] {
        if (!started || (buffer.empty() && !overflow && !escaped)) return;
        Frame frame;
        frame.bytes = buffer.size();
        frame.truncated = overflow || escaped;
        if (!frame.truncated && buffer.size() >= 3) {
            const size_t bodySize = buffer.size() - 2;
            const uint16_t expected = static_cast<uint16_t>(
                buffer[bodySize] | (static_cast<uint16_t>(buffer[bodySize + 1]) << 8));
            frame.crcVerified = fcs(buffer.data(), bodySize) == expected;
            if (frame.crcVerified) {
                frame.header = buffer[0];
                frame.headerValid = (buffer[0] & 0xc0) == 0x80;
                if (frame.headerValid) frame.commandId = commandId(buffer, bodySize);
            }
        }
        result.push_back(frame);
    };
    for (size_t i = 0; i < len; ++i) {
        const uint8_t b = input[i];
        if (b == 0x7e) {
            flush();
            started = true;
            escaped = overflow = false;
            buffer.clear();
            continue;
        }
        if (!started || overflow) continue;
        if (escaped) {
            buffer.push_back(static_cast<uint8_t>(b ^ 0x20));
            escaped = false;
        } else if (b == 0x7d) {
            escaped = true;
            continue;
        } else {
            buffer.push_back(b);
        }
        if (buffer.size() > kMaxFrame) {
            buffer.clear();
            overflow = true;
        }
    }
    // No closing flag: no final flush. This matches the offline recorder.
    return result;
}
}
extern "C" int IHBTestOneInput(const uint8_t *data, size_t size) {
    if (size > kMaxInput) return 0;
    const auto frames = parse(data, size);
    for (const auto &frame : frames) {
        if (frame.bytes > kMaxFrame || (frame.headerValid && !frame.crcVerified) ||
            (frame.commandId >= 0 && (!frame.crcVerified || !frame.headerValid)) ||
            frame.commandId > 0x1fffff) {
            std::abort(); // Fail closed on a native invariant violation.
        }
    }
    return 0;
}
#ifdef RIZZER_SPINEL_ORACLE
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    std::ifstream file(argv[1], std::ios::binary);
    if (!file) return 2;
    const std::vector<uint8_t> data{std::istreambuf_iterator<char>(file), {}};
    if (data.size() > kMaxInput) return 2;
    const auto frames = parse(data.data(), data.size());
    std::cout << "[";
    for (size_t i = 0; i < frames.size(); ++i) {
        if (i) std::cout << ",";
        const auto &f = frames[i];
        std::cout << "{\"bytes\":" << f.bytes
                  << ",\"truncated\":" << (f.truncated ? "true" : "false")
                  << ",\"crcVerified\":" << (f.crcVerified ? "true" : "false")
                  << ",\"headerValid\":" << (f.headerValid ? "true" : "false")
                  << ",\"header\":";
        if (f.header < 0) std::cout << "null"; else std::cout << f.header;
        std::cout << ",\"commandId\":";
        if (f.commandId < 0) std::cout << "null"; else std::cout << f.commandId;
        std::cout << ",\"commandDecoded\":" << (f.commandId < 0 ? "false" : "true") << "}";
    }
    std::cout << "]\n";
    return 0;
}
#endif
