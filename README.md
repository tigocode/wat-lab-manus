# WAT-LAB

API Node/Express para criação e gerenciamento de instâncias WhatsApp com Baileys. A persistência de instâncias e QR Codes usa **Cloud Firestore**; as credenciais de sessão usam **Firebase Storage**.

> **Configuração local:** o passo a passo completo está em [`SETUP.md`](./SETUP.md). Ele inclui Firebase Emulator Suite, Firestore, Storage, QR Code do Baileys, restauração de sessão e configuração com Firebase real.

## Início rápido local

```bash
npm install
cp .env.example .env
npx firebase-tools@latest emulators:start --project wat-lab-local --only firestore,storage
```

Em outro terminal, configure no `.env` `FIREBASE_PROJECT_ID=wat-lab-local`, `FIREBASE_STORAGE_BUCKET=wat-lab-local.appspot.com`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `STORAGE_EMULATOR_HOST=127.0.0.1:9199` e `REQUIRE_FIREBASE_AUTH=false`. Depois execute `npm start`. O painel dos emuladores estará em [http://127.0.0.1:4000](http://127.0.0.1:4000).

Para iniciar o fluxo Baileys, execute `POST /start-session`, leia o QR retornado com o WhatsApp e consulte `POST /getinstance`. O roteiro de comandos `curl` está no [`SETUP.md`](./SETUP.md).

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/wat-health` | Verifica a saúde da API. |
| POST | `/start-session` | Recebe `{ company, name }`, inicia uma instância e retorna o QR em data URL. |
| POST | `/generate-qr-link` | Persiste um QR temporário e retorna um link para o visualizador. |
| GET | `/qr/base64/:id` | Consulta o QR temporário. |
| POST | `/getinstance` | Recebe `{ instance }` e retorna o documento Firestore. |
| POST | `/logout-session` | Recebe `{ instance }` e encerra o socket da instância. |

Quando `REQUIRE_FIREBASE_AUTH=true`, todas as rotas exceto `/wat-health` exigem `Authorization: Bearer <Firebase ID token>`.

## Configuração

Copie `.env.example` para `.env` e preencha `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` e `FIREBASE_STORAGE_BUCKET`. A chave privada deve preservar as quebras de linha como `\\n`. Em produção, use um mecanismo seguro de secrets; não comite credenciais.

O clone `gestorsales-new` deve configurar `EXPO_PUBLIC_WAT_API_URL` com a URL pública desta API e as variáveis públicas do Firebase Client SDK. Credenciais administrativas nunca devem ser colocadas no aplicativo móvel.

## Execução

```bash
npm install
npm start
```

O modo de desenvolvimento continua disponível com `npm run dev`. O backend usa um mapa de sockets por instância, restaura autenticação do Storage e sincroniza os arquivos de sessão periodicamente para permitir recuperação após reinício.
