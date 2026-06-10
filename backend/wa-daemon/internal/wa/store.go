package wa

import (
	"context"

	_ "github.com/lib/pq" // driver postgres para database/sql
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"
)

// openClient abre el sqlstore de whatsmeow apuntando a Postgres y devuelve
// un whatsmeow.Client listo para Connect(). whatsmeow crea automáticamente
// sus propias tablas (whatsmeow_*) en la primera ejecución.
func openClient(ctx context.Context, dbURL string, logger waLog.Logger) (*whatsmeow.Client, error) {
	container, err := sqlstore.New(ctx, "postgres", dbURL, logger)
	if err != nil {
		return nil, err
	}
	device, err := container.GetFirstDevice(ctx)
	if err != nil {
		return nil, err
	}
	return whatsmeow.NewClient(device, logger), nil
}
