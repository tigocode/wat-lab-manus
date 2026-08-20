# Configuração e teste local do WAT-LAB

Este documento descreve como executar o backend, testar o fluxo real de autenticação do Baileys e verificar a persistência da instância no Firestore e das credenciais no Firebase Storage. O Emulator Suite substitui apenas Firestore e Storage; a autenticação do WhatsApp continua sendo feita contra o WhatsApp real e exige um telefone para ler o QR Code.

## 1. Pré-requisitos

Instale Node.js 20 ou superior, npm, Git e o Java Runtime exigido pelo Firebase Emulator Suite. Para usar o WhatsApp, tenha um telefone com o aplicativo atualizado e autorização para vincular um novo dispositivo.

## 2. Instalação

```bash
cd wat-lab
npm install
cp .env.example .env
```

Não coloque credenciais reais no Git. O arquivo `.env.example` é apenas um modelo.

## 3. Teste local sem projeto Firebase real

Abra um terminal para iniciar os emuladores:

```bash
npx firebase-tools@latest emulators:start --project wat-lab-local --only firestore,storage
```

O painel ficará em [http://127.0.0.1:4000](http://127.0.0.1:4000), o Firestore em `127.0.0.1:8080` e o Storage em `127.0.0.1:9199`.

Em outro terminal, configure o `.env` desta forma:

```dotenv
PORT=3002
NODE_ENV=development
FIREBASE_PROJECT_ID=wat-lab-local
FIREBASE_STORAGE_BUCKET=wat-lab-local.appspot.com
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
STORAGE_EMULATOR_HOST=127.0.0.1:9199
REQUIRE_FIREBASE_AUTH=false
```

Para o emulador, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` podem ficar vazios. Execute:

```bash
npm start
```

Confirme a saúde da API:

```bash
curl http://127.0.0.1:3002/wat-health
```

## 4. Teste ponta a ponta do Baileys

Inicie uma sessão com dados de teste:

```bash
curl -X POST http://127.0.0.1:3002/start-session \
  -H 'Content-Type: application/json' \
  -d '{"company":"Empresa Local","name":"Administrador"}'
```

A resposta deve conter `instance` e `Qrcode` como data URL PNG. Salve o valor de `Qrcode` em um arquivo HTML ou abra a imagem em uma página local. No telefone, abra **WhatsApp > Configurações > Dispositivos conectados > Conectar dispositivo** e leia o QR Code.

Depois da leitura, consulte o registro pelo identificador retornado:

```bash
curl -X POST http://127.0.0.1:3002/getinstance \
  -H 'Content-Type: application/json' \
  -d '{"instance":"SEU_INSTANCE"}'
```

O campo `status` deverá mudar de `qr_pending` para `connected`, e `phone` deverá ser preenchido. Acesse o painel do Emulator Suite e abra Firestore para verificar o documento `instances/SEU_INSTANCE`.

Enquanto a sessão estiver conectada, o backend sincroniza os arquivos de autenticação a cada 30 segundos. No painel do Storage Emulator, procure o prefixo `auth/SEU_INSTANCE/`. Esses arquivos permitem restaurar a sessão após reinício; trate-os como credenciais sensíveis.

Para testar o encerramento:

```bash
curl -X POST http://127.0.0.1:3002/logout-session \
  -H 'Content-Type: application/json' \
  -d '{"instance":"SEU_INSTANCE"}'
```

O Firestore deve registrar `status: disconnected`. Para testar a restauração, pare e inicie o backend novamente sem apagar o Storage Emulator e verifique se a instância recupera as credenciais. Em alguns casos o WhatsApp poderá exigir novo vínculo por políticas do próprio serviço.

## 5. Configuração com Firebase real

No [Firebase Console](https://console.firebase.google.com), crie ou selecione um projeto. Ative o Cloud Firestore em modo de produção ou teste, crie um bucket do Cloud Storage e gere uma conta de serviço em **Configurações do projeto > Contas de serviço**.

Preencha `.env` com:

```dotenv
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=seu-project-id.firebasestorage.app
REQUIRE_FIREBASE_AUTH=true
```

Em produção, use Secret Manager, variáveis protegidas do provedor ou arquivo de credencial montado fora do repositório. Nunca faça commit da chave privada. Substitua as regras permissivas locais por regras que exijam autenticação e limite o acesso aos documentos e caminhos de cada usuário.

## 6. Integração com o app móvel

No clone `gestorsales-new`, copie `.env.example` para `.env` e preencha as variáveis públicas do Firebase Client SDK e:

```dotenv
EXPO_PUBLIC_WAT_API_URL=http://SEU_IP_LOCAL:3002
```

Em dispositivo físico, `localhost` aponta para o próprio telefone; use o IP da máquina na rede local. Inicie o app com `npx expo start` e abra a aba **Instância**. O login e cadastro usam Firebase Auth; a criação, consulta e desconexão da sessão usam a API WAT-LAB.

## 7. Problemas comuns

Se o QR não for retornado, confira os logs do Baileys, a conectividade do computador e se o telefone permite novos dispositivos. Se Firestore ou Storage derem erro de credencial, confirme `FIREBASE_PROJECT_ID`, o formato de `FIREBASE_PRIVATE_KEY` e os hosts dos emuladores. Se o app móvel não alcançar a API, confirme CORS, firewall e o IP usado em `EXPO_PUBLIC_WAT_API_URL`.

As regras incluídas em `firestore.rules` e `storage.rules` são deliberadamente permissivas para testes locais e não devem ser publicadas em produção sem revisão.
