package main

import (
	"context"
	"fmt"
	"os"
	"time"
	"github.com/jackc/pgx/v5"
	"github.com/twmb/franz-go/pkg/kgo"
)

var cli *kgo.Client
var err error

// This must match the JSON keys from your producer exactly.
type telemData struct {
	UnitID      string  `json:"unitid"`
	Timestamp   string  `json:"timestamp"`
	Turbidity   float64 `json:"turbidity"`
	ATP         float64 `json:"atp"`
	Temperature float64 `json:"temperature"`
}

func main() {
	cl,err := pgx.Connect(context.Background(), "postgresql://postgres:greenteams@localhost:5432/postgres")
	seeds := []string{"localhost:9092"}
	if err != nil{
		fmt.Fprintf(os.Stderr, "Unable to connect to database")
	}
	defer cl.Close(context.Background())
	cli, err = kgo.NewClient(
		kgo.SeedBrokers(seeds...),
		kgo.ConsumeTopics("telemetry"),
		kgo.ConsumerGroup("systemconsumer"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to Kafka: %v\n", err)
		os.Exit(1)
	}
	defer cli.Close()

	for{
		fetches := cli.PollFetches(context.Background())
		if fetches == nil {
			time.Sleep(50 * time.Millisecond)
			continue
		}
		for _, record := range fetches.Records() {
			fmt.Println(string(record.Value))
		}
	}
}