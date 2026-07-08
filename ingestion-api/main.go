
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
	db, err = pgx.Connect(context.Background(), "postgresql://postgres:greenteams@localhost:5432/postgres?sslmode=disable")
	
	if err != nil {
		log.Fatalf("unable to connect to database: %v", err)
	}
	defer db.Close(context.Background())
	http.HandleFunc("/health", handleHello)
	http.HandleFunc("/telemetry", handleTelemetry)
	http.HandleFunc("/data",handleData)
	
	fmt.Println("Server is starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleHello(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	wc, err := w.Write([]byte("Server is running!\n"))
	if err != nil {
		slog.Error("error writing response", "err", err)
		return
	}
	fmt.Printf("%d bytes written\n", wc)
}

func handleData(w http.ResponseWriter, r *http.Request){
	w.Header().Set("Access-Control-Allow-Origin", "*")
	rows, err := db.Query(r.Context(),"SELECT unitid, timestamp, turbidity, atp, temperature FROM telemetry ORDER BY timestamp DESC LIMIT 50")
	if err!=nil{
		log.Printf("database query error: %v", err)
		http.Error(w, "something went wrong", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var results []sensorData
	for rows.Next() {
        var dat sensorData
        err := rows.Scan(&dat.UnitID, &dat.Timestamp, &dat.Turbidity, &dat.ATP, &dat.Temperature)
        if err!=nil{
			log.Printf("database query error: %v", err)
			http.Error(w, "something went wrong", http.StatusInternalServerError)
			return
		}
        results = append(results, dat)
    }
	if err = rows.Err(); err != nil {
        log.Printf("database query error: %v", err)
		http.Error(w, "something went wrong", http.StatusInternalServerError)
		return
    }

    w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func handleTelemetry(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
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