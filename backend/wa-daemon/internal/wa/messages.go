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

// unwrap desenvuelve los contenedores que WhatsApp usa a veces (mensajes
// efímeros, ver-una-vez, enviados-por-otro-dispositivo) para llegar al
// contenido real. Es común en grupos.
func unwrap(m *waE2E.Message) *waE2E.Message {
	for i := 0; i < 5 && m != nil; i++ {
		switch {
		case m.GetEphemeralMessage() != nil:
			m = m.GetEphemeralMessage().GetMessage()
		case m.GetViewOnceMessage() != nil:
			m = m.GetViewOnceMessage().GetMessage()
		case m.GetViewOnceMessageV2() != nil:
			m = m.GetViewOnceMessageV2().GetMessage()
		case m.GetViewOnceMessageV2Extension() != nil:
			m = m.GetViewOnceMessageV2Extension().GetMessage()
		case m.GetDeviceSentMessage() != nil:
			m = m.GetDeviceSentMessage().GetMessage()
		case m.GetDocumentWithCaptionMessage() != nil:
			m = m.GetDocumentWithCaptionMessage().GetMessage()
		default:
			return m
		}
	}
	return m
}

// extractContent decodifica el tipo de mensaje recibido. Cubre los más comunes
// (texto, imagen, audio, video, documento, sticker, ubicación) y desenvuelve
// los contenedores típicos de grupos.
func extractContent(e *events.Message) (kind, body, mediaURL, mediaMime string) {
	m := unwrap(e.Message)
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
