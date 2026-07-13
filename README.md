# Personal Fitness App — versión 4.3

Aplicación personal, estática y compatible con GitHub Pages.

## Funciones

- Rutinas de gimnasio.
- Cuatro semanas de natación.
- Registro y eliminación individual de sesiones.
- Historial, constancia y racha.
- Exportación e importación de respaldo local.
- Objetivos de composición corporal con fecha de cumplimiento y días transcurridos.
- Indicador orientativo de recuperación.
- Próxima cita de psicología con recordatorio dentro de la app un día antes.
- Seguimiento de fisioterapia en la sección Citas.
- Plan nutricional estático.
- Carga privada de InBody mediante archivo JSON.
- Funcionamiento offline como PWA.

## Archivos públicos

- `index.html`
- `style.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `icon-192.png`
- `icon-512.png`
- `README.md`
- `.gitignore`

## Privacidad

Los siguientes datos se almacenan únicamente en el navegador del dispositivo:

- Historial de sesiones.
- Objetivos y fechas de cumplimiento.
- Próxima cita de psicología.
- Seguimiento de fisioterapia.
- Chequeos de recuperación.
- Composición corporal cargada localmente.

No subas a GitHub:

- `body-composition.json`
- archivos `personal-fitness-backup-*.json`

## Recordatorios

Los recordatorios de psicología y fisioterapia aparecen cuando abres la app.
Esta versión no envía notificaciones del sistema cuando la app está cerrada.

## Nota de salud

El indicador de recuperación es orientativo. No diagnostica lesiones ni sustituye
una valoración médica, fisioterapéutica o de otro profesional de salud.
