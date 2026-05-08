package wa

import (
	"errors"
	"strings"

	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	"google.golang.org/protobuf/proto"
)

func parseJID(raw string) (types.JID, error) {
	if raw == "" {
		return types.JID{}, errors.New("empty jid")
	}
	if !strings.Contains(raw, "@") {
		// Permitir pasar solo el número y asumir s.whatsapp.net
		raw = raw + "@s.whatsapp.net"
	}
	jid, err := types.ParseJID(raw)
	if err != nil {
		return types.JID{}, err
	}
	return jid, nil
}

func buildTextMessage(body string) *waE2E.Message {
	return &waE2E.Message{
		Conversation: proto.String(body),
	}
}

// extractContent decodifica el tipo de mensaje recibido. Por ahora cubrimos
// los más comunes (texto, imagen, audio, video, documento, sticker, ubicación).
// El caller que necesite más detalle puede leer e.Message directamente.
func extractContent(e *events.Message) (kind, body, mediaURL, mediaMime string) {
	m := e.Message
	if m == nil {
		return "TEXT", "", "", ""
	}

	switch {
	case m.GetConversation() != "":
		return "TEXT", m.GetConversation(), "", ""

	case m.GetExtendedTextMessage() != nil:
		return "TEXT", m.GetExtendedTextMessage().GetText(), "", ""

	case m.GetImageMessage() != nil:
		img := m.GetImageMessage()
		return "IMAGE", img.GetCaption(), img.GetURL(), img.GetMimetype()

	case m.GetAudioMessage() != nil:
		a := m.GetAudioMessage()
		return "AUDIO", "", a.GetURL(), a.GetMimetype()

	case m.GetVideoMessage() != nil:
		v := m.GetVideoMessage()
		return "VIDEO", v.GetCaption(), v.GetURL(), v.GetMimetype()

	case m.GetDocumentMessage() != nil:
		d := m.GetDocumentMessage()
		return "DOCUMENT", d.GetTitle(), d.GetURL(), d.GetMimetype()

	case m.GetStickerMessage() != nil:
		s := m.GetStickerMessage()
		return "STICKER", "", s.GetURL(), s.GetMimetype()

	case m.GetLocationMessage() != nil:
		return "LOCATION", "", "", ""

	case m.GetContactMessage() != nil:
		return "CONTACT", m.GetContactMessage().GetDisplayName(), "", ""

	case m.GetReactionMessage() != nil:
		return "REACTION", m.GetReactionMessage().GetText(), "", ""
	}

	return "SYSTEM", "", "", ""
}
