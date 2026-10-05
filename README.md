# borrar-x

Scripts de consola para vaciar tu cuenta de X (Twitter) sin dar tu correo ni acceso a servicios de terceros. Se ejecutan en tu propio navegador, con tu sesión.

## Qué borra
- Posts, respuestas y retuits (pestañas **Posts** y **Respuestas** de tu perfil)
- Me gusta (pestaña **Me gusta**)

No borra mensajes directos ni marcadores.

## Archivos
- `borrar-x-api.js`: **recomendado**. Aprende la petición de borrado de X y la repite en paralelo. Mucho más rápido.
- `borrar-x-clics.js`: alternativa lenta que pulsa los botones de la interfaz.

## Uso
1. Entra en **x.com** desde un navegador de escritorio, inicia sesión y abre tu perfil.
2. Elige la pestaña: **Posts**, **Respuestas** o **Me gusta**. Pulsa **F5**.
3. Abre la consola: `Ctrl + Shift + J` (Chrome/Edge), `Ctrl + Shift + K` (Firefox). Si no te deja pegar, escribe `allow pasting` y pulsa Enter.
4. Pega el contenido del script y pulsa Enter.
5. Repite en cada pestaña. Al terminar, recarga y vuelve a ejecutarlo por si se saltó algo.

## Notas
- Con `borrar-x-api.js`, el script borra con clics un primer elemento para capturar la petición real. Si no lo consigue solo, borra uno a mano y lo detecta.
- Si X aplica límite de peticiones (error 429), el script pausa y reanuda solo.
- El número de posts del perfil puede tardar horas o días en actualizarse aunque ya no quede nada. Para comprobarlo, busca `from:tuusuario` (sin espacio) en la pestaña *Más recientes*.
- Puedes subir `PARALELO` (primera línea del script) de 5 a 8. Más de eso suele activar el límite de X.

## Aviso
Proyecto no oficial, sin relación con X Corp. X puede cambiar su web y romper los scripts, y automatizar acciones puede ir contra sus condiciones de uso. Úsalo bajo tu responsabilidad. **Los borrados son irreversibles.**
