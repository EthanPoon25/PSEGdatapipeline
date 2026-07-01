package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net/http"
)

type sensorData struct {
	UnitID      string  `json:"unitid"`
	Timestamp   string  `json:"timestamp"`
	Turbidity   float64 `json:"turbidity"`
	ATP         float64 `json:"atp"`
	Temperature float64 `json:"temperature"`
}

func main() {
	http.HandleFunc("/health", handleHello)
	http.HandleFunc("/telemetry", handleTelemetry)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleHello(w http.ResponseWriter, r *http.Request) {
	wc, err := w.Write([]byte("Server is running!\n"))
	if err != nil {
		slog.Error("error writing response", "err", err)
		return
	}

	fmt.Println("%d bytes written", wc)
}

func handleTelemetry(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		slog.Error("error writing response")
		return
	}

	data, err := io.ReadAll((r.Body))
	if err != nil {
		slog.Error("error writing response", "err", err, data)
		return
	}

	var sensordata sensorData
	errs := json.Unmarshal(data, &sensordata)
	if errs != nil {
		fmt.Println(errs)
		w.WriteHeader(400)
		return
	}
	fmt.Println("%+v\n", sensordata)
	w.WriteHeader(http.StatusOK)
}
