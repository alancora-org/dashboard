# Dashboard

O Caddy serve `/js/config.js` usando a variável de ambiente `API_URL`. Se ela não estiver definida ou estiver vazia, o padrão é `http://localhost:8080`.

Execute nesta pasta:

```sh
PORT=8081 API_URL=http://localhost:8080 caddy run --config Caddyfile
```

Abra `http://localhost:8081`.
