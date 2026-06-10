package wa

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types/events"
)

// mediaDir es donde guardamos los archivos descargados de WhatsApp.
// Se sirve por HTTP en /media/<archivo>.
var mediaDir = func() string {
	d := os.Getenv("MEDIA_DIR")
	if d == "" {
		d = "media"
	}
	_ = os.MkdirAll(d, 0o755)
	return d
}()

// MediaDir expone el directorio para que el servidor HTTP lo sirva.
func MediaDir() string { return mediaDir }

// extMap devuelve una extensión razonable según el mimetype.
func extFor(mime string) string {
	switch {
	case mime == "image/jpeg":
		return ".jpg"
	case mime == "image/png":
		return ".png"
	case mime == "image/webp":
		return ".webp"
	case mime == "video/mp4":
		return ".mp4"
	case mime == "audio/ogg; codecs=opus", mime == "audio/ogg":
		return ".ogg"
	case mime == "audio/mpeg":
		return ".mp3"
	case mime == "application/pdf":
		return ".pdf"
	default:
		return ".bin"
	}
}

// downloadIncoming descarga y descifra la media de un mensaje entrante,
// la guarda en disco y devuelve el nombre de archivo (servible por HTTP).
// Devuelve "" si el mensaje no tiene media descargable.
func (c *Client) downloadIncoming(ctx context.Context, e *events.Message) (filename, mime string) {
	m := unwrap(e.Message)
	if m == nil {
		return "", ""
	}

	var downloadable whatsmeow.DownloadableMessage
	switch {
	case m.GetImageMessage() != nil:
		downloadable, mime = m.GetImageMessage(), m.GetImageMessage().GetMimetype()
	case m.GetVideoMessage() != nil:
		downloadable, mime = m.GetVideoMessage(), m.GetVideoMessage().GetMimetype()
	case m.GetAudioMessage() != nil:
		downloadable, mime = m.GetAudioMessage(), m.GetAudioMessage().GetMimetype()
	case m.GetDocumentMessage() != nil:
		downloadable, mime = m.GetDocumentMessage(), m.GetDocumentMessage().GetMimetype()
	case m.GetStickerMessage() != nil:
		downloadable, mime = m.GetStickerMessage(), m.GetStickerMessage().GetMimetype()
	default:
		return "", ""
	}

	data, err := c.wa.Download(ctx, downloadable)
	if err != nil {
		return "", ""
	}

	// Nombre estable por contenido (hash) + extensión por mime.
	sum := sha256.Sum256(data)
	name := hex.EncodeToString(sum[:16]) + extFor(mime)
	path := filepath.Join(mediaDir, name)
	if _, err := os.Stat(path); err != nil {
		if err := os.WriteFile(path, data, 0o644); err != nil {
			return "", ""
		}
	}
	return name, mime
}

// uploadOutgoing sube un archivo a los servidores de WhatsApp y construye
// el mensaje apropiado (imagen, video, documento) según el mimetype.
func (c *Client) uploadOutgoing(ctx context.Context, data []byte, mime, caption, filename string) (*waE2E.Message, error) {
	mediaType := whatsmeow.MediaImage
	switch {
	case mime[:5] == "video":
		mediaType = whatsmeow.MediaVideo
	case mime[:5] == "audio":
		mediaType = whatsmeow.MediaAudio
	case mime[:5] != "image":
		mediaType = whatsmeow.MediaDocument
	}

	up, err := c.wa.Upload(ctx, data, mediaType)
	if err != nil {
		return nil, fmt.Errorf("upload: %w", err)
	}

	switch mediaType {
	case whatsmeow.MediaImage:
		return &waE2E.Message{ImageMessage: &waE2E.ImageMessage{
			Caption:       strPtr(caption),
			Mimetype:      strPtr(mime),
			URL:           &up.URL,
			DirectPath:    &up.DirectPath,
			MediaKey:      up.MediaKey,
			FileEncSHA256: up.FileEncSHA256,
			FileSHA256:    up.FileSHA256,
			FileLength:    &up.FileLength,
		}}, nil
	case whatsmeow.MediaVideo:
		return &waE2E.Message{VideoMessage: &waE2E.VideoMessage{
			Caption:       strPtr(caption),
			Mimetype:      strPtr(mime),
			URL:           &up.URL,
			DirectPath:    &up.DirectPath,
			MediaKey:      up.MediaKey,
			FileEncSHA256: up.FileEncSHA256,
			FileSHA256:    up.FileSHA256,
			FileLength:    &up.FileLength,
		}}, nil
	case whatsmeow.MediaAudio:
		return &waE2E.Message{AudioMessage: &waE2E.AudioMessage{
			Mimetype:      strPtr(mime),
			URL:           &up.URL,
			DirectPath:    &up.DirectPath,
			MediaKey:      up.MediaKey,
			FileEncSHA256: up.FileEncSHA256,
			FileSHA256:    up.FileSHA256,
			FileLength:    &up.FileLength,
		}}, nil
	default:
		return &waE2E.Message{DocumentMessage: &waE2E.DocumentMessage{
			Title:         strPtr(filename),
			FileName:      strPtr(filename),
			Caption:       strPtr(caption),
			Mimetype:      strPtr(mime),
			URL:           &up.URL,
			DirectPath:    &up.DirectPath,
			MediaKey:      up.MediaKey,
			FileEncSHA256: up.FileEncSHA256,
			FileSHA256:    up.FileSHA256,
			FileLength:    &up.FileLength,
		}}, nil
	}
}

func strPtr(s string) *string { return &s }
