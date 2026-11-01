#!/bin/sh
# Compile solution.cpp to /tmp/solution
g++ -O2 -std=c++17 -Wall /sandbox/solution.cpp -o /tmp/solution
compile_status=$?

if [ $compile_status -ne 0 ]; then
    exit $compile_status
fi

# Execute the compiled binary
exec /tmp/solution
