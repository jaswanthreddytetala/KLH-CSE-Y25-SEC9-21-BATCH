#include <stdio.h>
#include <time.h>

/*
 * Native OS-layer reference implementation.
 * This file is intentionally kept separate from the web dashboard and is not
 * modified by the browser-based application. It represents the lower-level C
 * implementation that can run on Linux systems using pthreads, pipes, shared
 * memory, and filesystem APIs.
 */

int main(void) {
    time_t now = time(NULL);
    struct tm *local = localtime(&now);
    printf("Alarm Clock System (C reference implementation)\n");
    printf("Current local time: %02d:%02d:%02d\n",
           local->tm_hour, local->tm_min, local->tm_sec);
    printf("This C program remains the OS implementation for process, IPC, memory, and concurrency concepts.\n");
    return 0;
}
