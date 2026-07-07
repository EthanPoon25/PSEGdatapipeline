package main

import (
    "context"
    "encoding/json" // Need this to decode your Kafka messages!
    "fmt"
    "os"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/twmb/franz-go/pkg/kgo"
)

var cli *kgo.Client
var err error

// Capitalized fields so encoding/json can access them!
type telemData struct {
    UnitID      string  `json:"unitid"`
    Timestamp   string  `json:"timestamp"`
    Turbidity   float64 `json:"turbidity"`
    ATP         float64 `json:"atp"`
    Temperature float64 `json:"temperature"`
}

func main() {
    cl, err := pgx.Connect(context.Background(), "postgresql://postgres:greenteams@localhost:5432/postgres?sslmode=disable")
    if err != nil {
        // Fixed the error print and added the exit!
        fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
        os.Exit(1) 
    }
    defer cl.Close(context.Background())
    
    seeds := []string{"localhost:9092"}
    cli, err = kgo.NewClient(
        kgo.SeedBrokers(seeds...),
        kgo.ConsumeTopics("telemetry"),
        kgo.ConsumerGroup("systemconsumer"))
    if err != nil {
        fmt.Fprintf(os.Stderr, "Unable to connect to Kafka: %v\n", err)
        os.Exit(1)
    }
    defer cli.Close()

    for {
        fetches := cli.PollFetches(context.Background())
        if fetches == nil {
            time.Sleep(50 * time.Millisecond)
            continue
        }
        
        for _, record := range fetches.Records() {
            // 1. Create an empty struct to hold the data
            var data telemData
            
            // 2. Unmarshal the JSON byte slice into the struct
            err := json.Unmarshal(record.Value, &data)
            if err != nil {
                fmt.Printf("Error decoding JSON: %v\n", err)
                continue // Skip this bad record and move to the next one
            }

            // 3. Print it just so we can see it working
            fmt.Printf("Inserting: %s at %s\n", data.UnitID, data.Timestamp)

            // 4. Use the database connection (cl) to execute the INSERT statement.
            // The $1, $2 are placeholders that safely inject your variables.
            _, err = cl.Exec(context.Background(), 
                `INSERT INTO telemetry (unitid, timestamp, turbidity, atp, temperature) 
                 VALUES ($1, $2, $3, $4, $5)`,
                data.UnitID, data.Timestamp, data.Turbidity, data.ATP, data.Temperature,
            )
            
            if err != nil {
                fmt.Printf("Failed to insert into database: %v\n", err)
            }
        }
    }
}