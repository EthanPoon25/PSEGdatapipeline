package main

import (
	"fmt"
	"log"
	"log/slog"
	"net/http"
)

func main() {
	http.HandleFunc("/", handleHello)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleHello(w http.ResponseWriter, __ *http.Request) {
	wc, err := w.Write([]byte("Hello World!\n"))
	if err != nil {
		slog.Error("error writing response", "err", err)
		return
	}

	fmt.Printf("%d bytes written", wc)
}
