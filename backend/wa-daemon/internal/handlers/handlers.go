package handlers

import (
	"encoding/base64"
	"encoding/json"
	"net/http"

	"github.com/tppperu/wa-daemon/internal/wa"
)

type Handlers struct {
	wa *wa.Client
}

func New(client *wa.Client) *Handlers {
	return &Handlers{wa: client}
}

func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handlers) Status(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.wa.Status())
}

func (h *Handlers) Connect(w http.ResponseWriter, r *http.Request) {
	qr, err := h.wa.Connect(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if qr == "qr-pending" {
		writeJSON(w, http.StatusAccepted, map[string]string{
			"status":  "qr-pending",
			"message": "QR will be published to Redis. Listen on the QR channel.",
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "connected"})
}

func (h *Handlers) Disconnect(w http.ResponseWriter, r *http.Request) {
	h.wa.Disconnect(r.Context())
	writeJSON(w, http.StatusOK, map[string]string{"status": "disconnected"})
}

type sendRequest struct {
	RemoteJID string `json:"remoteJid"`
	Body      string `json:"body"`
}

type sendMediaRequest struct {
	RemoteJID string `json:"remoteJid"`
	DataB64   string `json:"data"`     // archivo en base64
	Mime      string `json:"mime"`     // image/jpeg, video/mp4, application/pdf...
	Caption   string `json:"caption"`  // texto opcional
	Filename  string `json:"filename"` // para documentos
}

func (h *Handlers) Send(w http.ResponseWriter, r *http.Request) {
	var req sendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.RemoteJID == "" || req.Body == "" {
		writeError(w, http.StatusBadRequest, "remoteJid and body are required")
		return
	}

	res, err := h.wa.SendText(r.Context(), req.RemoteJID, req.Body)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *Handlers) SendMedia(w http.ResponseWriter, r *http.Request) {
	var req sendMediaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.RemoteJID == "" || req.DataB64 == "" || req.Mime == "" {
		writeError(w, http.StatusBadRequest, "remoteJid, data and mime are required")
		return
	}
	data, err := base64.StdEncoding.DecodeString(req.DataB64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "data must be valid base64")
		return
	}
	res, err := h.wa.SendMedia(r.Context(), req.RemoteJID, data, req.Mime, req.Caption, req.Filename)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
