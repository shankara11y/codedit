#!/bin/sh
# Compile Main.java to /tmp
javac -d /tmp /sandbox/Main.java
compile_status=$?

if [ $compile_status -ne 0 ]; then
    exit $compile_status
fi

# Execute the compiled Main class with constrained heap
exec java -Xmx192m -XX:+UseSerialGC -cp /tmp Main
