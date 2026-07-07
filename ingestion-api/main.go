package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net/http"
	"github.com/jackc/pgx/v5"
	"github.com/twmb/franz-go/pkg/kgo"
)

type sensorData struct {
	UnitID      string  `json:"unitid"`
	Timestamp   string  `json:"timestamp"`
	Turbidity   float64 `json:"turbidity"`
	ATP         float64 `json:"atp"`
	Temperature float64 `json:"temperature"`
}

var cl *kgo.Client
var db *pgx.Conn

func main() {
	var err error
	seeds := []string{"localhost:9092"}
	cl, err = kgo.NewClient(kgo.SeedBrokers(seeds...))
	if err != nil {
		log.Fatalf("unable to create kafka client: %v", err)
	}
	
	// Ensure the client is closed cleanly on shutdown
	defer cl.Close()
	cl, err = pgx.Connect(context.Background(), "postgresql://postgres:greenteams@localhost:5432/postgres?sslmode=disable")
	http.HandleFunc("/health", handleHello)
	http.HandleFunc("/telemetry", handleTelemetry)
	http.HandleFunc("/data",handleData)
	
	fmt.Println("Server is starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleHello(w http.ResponseWriter, r *http.Request) {
	wc, err := w.Write([]byte("Server is running!\n"))
	if err != nil {
		slog.Error("error writing response", "err", err)
		return
	}
	fmt.Printf("%d bytes written\n", wc)
}

func handleData(w http.ResponseWriter, r *http.Request){
	wc, err := w.Write([]byte("Server is running for data!\n"))
	if err != nil {
		slog.Error("error writing response", "err", err)
		return
	}
	fmt.Printf("%d bytes written\n", wc)
}

func handleTelemetry(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	data, err := io.ReadAll(r.Body)
	if err != nil {
		slog.Error("error reading request body", "err", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate the JSON
	var sensordata sensorData
	if err := json.Unmarshal(data, &sensordata); err != nil {
		slog.Error("invalid json payload", "err", err)
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	fmt.Printf("Received: %+v\n", sensordata)

	record := &kgo.Record{Topic: "telemetry", Value: data}
	ctx := context.Background()
	
	if err := cl.ProduceSync(ctx, record).FirstErr(); err != nil {
		slog.Error("kafka produce error", "err", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}