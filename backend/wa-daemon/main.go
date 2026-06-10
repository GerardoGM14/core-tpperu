package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"

	"github.com/tppperu/wa-daemon/internal/bus"
	"github.com/tppperu/wa-daemon/internal/handlers"
	"github.com/tppperu/wa-daemon/internal/wa"
)

func main() {
	_ = godotenv.Load()

	port := getenv("PORT", "8080")
	dbURL := mustEnv("DATABASE_URL")
	redisAddr := getenv("REDIS_ADDR", "localhost:6379")
	redisPass := os.Getenv("REDIS_PASSWORD")

	channels := bus.Channels{
		Inbound: getenv("CHANNEL_INBOUND", "whatsapp:inbound"),
		QR:      getenv("CHANNEL_QR", "whatsapp:qr"),
		Status:  getenv("CHANNEL_STATUS", "whatsapp:status"),
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	publisher, err := bus.NewRedisPublisher(ctx, redisAddr, redisPass, channels)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	defer publisher.Close()

	client, err := wa.New(ctx, wa.Config{
		DatabaseURL: dbURL,
		Publisher:   publisher,
	})
	if err != nil {
		log.Fatalf("whatsmeow: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))

	h := handlers.New(client)
	r.Get("/health", h.Health)
	r.Get("/status", h.Status)
	r.Post("/connect", h.Connect)
	r.Post("/disconnect", h.Disconnect)
	r.Post("/send", h.Send)
	r.Post("/send-media", h.SendMedia)

	// Servir archivos de media descargados de WhatsApp en /media/*
	mediaFS := http.FileServer(http.Dir(wa.MediaDir()))
	r.Handle("/media/*", http.StripPrefix("/media/", mediaFS))

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("wa-daemon listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("http: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	log.Println("shutting down...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = srv.Shutdown(shutdownCtx)
	client.Close()
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func mustEnv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("env %s is required", k)
	}
	return v
}
