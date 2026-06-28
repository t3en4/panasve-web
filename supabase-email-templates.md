# Plantillas de correo de PanasVE (para Supabase)

Dónde configurarlas:
Supabase → Authentication → Emails → Templates
Selecciona la plantilla (Reset Password, Confirm signup, etc.), pega el HTML
en el cuerpo y ajusta el "Subject".

----------------------------------------------------------------
## 1. Reset Password (Recuperar contraseña)

Subject:
Recupera tu contraseña — PanasVE

Cuerpo (Message body, formato HTML):
----------------------------------------------------------------
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
  <div style="background:#1a1a1a;color:#fff;padding:18px 22px;font-size:19px;font-weight:600">🇻🇪 PanasVE</div>
  <div style="padding:24px 22px;color:#333">
    <h2 style="margin:0 0 14px;font-size:18px;color:#222">Recupera tu contraseña</h2>
    <p style="font-size:14px;line-height:1.6;color:#444">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en PanasVE.
      Haz clic en el botón para crear una nueva:
    </p>
    <p style="text-align:center;margin:26px 0">
      <a href="{{ .ConfirmationURL }}"
         style="background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block">
        Crear nueva contraseña
      </a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#777">
      Si no solicitaste este cambio, puedes ignorar este correo: tu contraseña
      seguirá siendo la misma.
    </p>
  </div>
  <div style="padding:14px 22px;background:#fafafa;font-size:12px;color:#999;border-top:1px solid #eee">
    Solidaridad por Venezuela · PanasVE
  </div>
</div>
----------------------------------------------------------------


## 2. Confirm signup (Confirmar registro) — opcional, si reactivas la confirmación

Subject:
Bienvenido a PanasVE — confirma tu cuenta

Cuerpo:
----------------------------------------------------------------
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
  <div style="background:#1a1a1a;color:#fff;padding:18px 22px;font-size:19px;font-weight:600">🇻🇪 PanasVE</div>
  <div style="padding:24px 22px;color:#333">
    <h2 style="margin:0 0 14px;font-size:18px;color:#222">¡Bienvenido a PanasVE!</h2>
    <p style="font-size:14px;line-height:1.6;color:#444">
      Gracias por unirte a la red de solidaridad. Confirma tu correo para activar tu cuenta:
    </p>
    <p style="text-align:center;margin:26px 0">
      <a href="{{ .ConfirmationURL }}"
         style="background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block">
        Confirmar mi cuenta
      </a>
    </p>
  </div>
  <div style="padding:14px 22px;background:#fafafa;font-size:12px;color:#999;border-top:1px solid #eee">
    Solidaridad por Venezuela · PanasVE
  </div>
</div>
----------------------------------------------------------------

NOTA: la variable {{ .ConfirmationURL }} la rellena Supabase automáticamente
con el enlace correcto. No la cambies.
