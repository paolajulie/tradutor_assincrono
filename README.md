# 🌐 Tradutor Assíncrono com Microsserviços

Um sistema de **tradução de textos** baseado em **arquitetura de microsserviços**.  
Ele utiliza uma **API REST**, um **worker em background** e uma **fila de mensagens (RabbitMQ)** para processar traduções de forma **assíncrona e escalável**.

Toda a aplicação roda em containers Docker para fácil execução.


## ✅ Funcionalidades

- **API REST (`translation-api`)**
  - `POST /translations`: submeter texto para tradução.
  - `GET /translations/:requestId`: consultar status/resultados.
- **Worker (`translation-worker`)**
  - Escuta a fila em background.
  - Usa **Google Gemini API** para traduzir.
  - Atualiza status (`queued`, `processing`, `completed`, `failed`).
- **Comunicação assíncrona** via RabbitMQ.
- **Banco de dados** PostgreSQL para armazenar traduções.
- **Frontend simples** (HTML, CSS, JS).
- **Servidor web** com NGINX.


## 🛠️ Tecnologias

- **Backend**: Node.js + Express.js
- **Frontend**: HTML, CSS, JavaScript
- **Banco de Dados**: PostgreSQL
- **Mensageria**: RabbitMQ
- **Infraestrutura**: Docker, Docker Compose
- **API de Tradução**: Google Gemini

## 🚀 Como Rodar

### 1. Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/)  
- [Docker Compose](https://docs.docker.com/compose/)

### 2. Configuração do `.env`
Copie o arquivo de exemplo e edite com sua chave da API do Google AI Studio. No arquivo `.env`, substitua o valor da variável abaixo:

```env
GOOGLE_API_KEY="SUA_CHAVE_DO_GOOGLE_AI_STUDIO"
```

Você pode obter uma chave gratuita no Google AI Studio.

### 3. Subir os containers
Na raiz do projeto, rode:
```bash

docker-compose up --build
```

Esse comando irá construir as imagens e iniciar todos os serviços.
Na primeira execução pode demorar alguns minutos.

## 🧪 Como Usar
### Frontend:

Acesse no navegador:
👉 http://localhost:8080

#### API REST

Disponível na porta 3000.
Exemplo para criar tradução:

POST http://localhost:3000/translations
Content-Type: application/json
```bash

{
  "text": "Simplicity is the ultimate sophistication.",
  "sourceLanguage": "en",
  "targetLanguage": "pt"
}
```


### Consultar status da tradução:

GET http://localhost:3000/translations/<REQUEST_ID>

#### RabbitMQ

Interface de administração: http://localhost:15672

Usuário: user

Senha: password

## ⚙️ Testando com Postman
### 1. Criar uma tradução

Método: POST

URL: http://localhost:3000/translations

Body (raw, JSON):

```bash

{
  "text": "Hello world!",
  "sourceLanguage": "en",
  "targetLanguage": "pt"
}
```
### 2. Consultar status

Método: GET

URL: http://localhost:3000/translations/<SEU_REQUEST_ID>

## 📂 Estrutura do Projeto
```bash

.
├── translation-api/        # API REST
├── translation-worker/     # Worker de tradução
├── frontend/               # Interface web
├── docker-compose.yml      # Orquestração dos serviços
├── .env.example            # Exemplo de configuração
└── README.md               # Este arquivo
```
