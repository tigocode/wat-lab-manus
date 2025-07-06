# WAT-LAB

## Introdução

API para criação de instâncias WhatsApp e geração de QR Code para autenticação.

---

## Como usar

### Endpoint: Iniciar Sessão

**POST** `/start-session`

Inicia uma nova sessão e retorna o QR Code para autenticação.

#### Parâmetros (JSON no body):

| Campo   | Tipo   | Obrigatório | Descrição                |
|---------|--------|-------------|--------------------------|
| company | string | Sim         | Nome da empresa          |
| name    | string | Sim         | Nome do usuário/instância|

#### Exemplo de requisição

```json
POST /start-session
Content-Type: application/json

{
  "company": "MinhaEmpresa",
  "name": "Joao"
}
```

#### Exemplo de resposta (sucesso)

```json
{
  "message": "Instância criada com sucesso!",
  "instance": "MJJO-123456",
  "Qrcode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

#### Possíveis erros

- **400**: Empresa e nome são obrigatórios
- **408**: QR Code não gerado a tempo
- **500**: Erro ao iniciar sessão

---

## Variáveis de ambiente

Veja o arquivo [.env](.env) para configuração do banco de dados, AWS e porta.

---

## Scripts

- `npm run dev` — inicia em modo desenvolvimento (nodemon)
- `npm start` — inicia em modo produção

---

## Estrutura de Pastas

- `src/controllers` — Lógica dos endpoints
- `src/services` — Serviços de instância e integração
- `src/connection` — Conexão e migrações do banco
- `src/routes` — Rotas da API

---

## Observações

- O QR Code retornado está em formato base64 (data URL).
- Após autenticação, a sessão é salva e enviada para o S3
