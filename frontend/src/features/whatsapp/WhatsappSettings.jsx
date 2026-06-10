import React from 'react';
import WhatsappConnect from './WhatsappConnect';

export default function WhatsappSettings() {
  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Conexión de WhatsApp</h1>
          <p className="lead" style={{ marginTop: 4 }}>
            Vincula el número de WhatsApp del negocio para enviar y recibir mensajes desde el panel.
          </p>
        </div>
      </div>

      <div className="spacer-m" />

      <WhatsappConnect />
    </div>
  );
}
