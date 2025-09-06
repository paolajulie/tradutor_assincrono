Tradutor Assíncrono com Microsserviços

Este projeto é um sistema de tradução de textos construído com uma arquitetura de microsserviços. Ele utiliza uma API, um worker em background e uma fila de mensagens para processar as traduções de forma assíncrona.

O ambiente é totalmente containerizado com Docker para facilitar a execução.

✅ Funcionalidades Implementadas

API REST (translation-api):

Endpoint POST /translations para submeter um texto.

Endpoint GET /translations/:requestId para consultar o status.

Serviço Consumidor (translation-worker):

Escuta a fila de mensagens em background.

Utiliza a API do Google Gemini para realizar a tradução.

Atualiza o status do processo (processing, completed, failed).

Comunicação Assíncrona: Utiliza RabbitMQ como fila de mensagens.

Armazenamento de Estado: Utiliza PostgreSQL para persistir os dados.

Frontend Interativo: Uma interface web simples para usar o sistema.


🛠️ Tecnologias

Backend: Node.js, Express.js

Frontend: HTML, CSS, JavaScript

Banco de Dados: PostgreSQL

Fila de Mensagens: RabbitMQ

Servidor Web: NGINX

Containerização: Docker, Docker Compose



🚀 Como Executar o Projeto

Siga os 3 passos abaixo para rodar a aplicação.

Passo 1: Pré-requisitos

Certifique-se de que o Docker e o Docker Compose estão instalados e em execução na sua máquina.

Passo 2: Configurar a Chave de API

O projeto precisa de uma chave da API do Google para funcionar.

Na raiz do projeto, copie o arquivo de exemplo para criar seu arquivo de configuração:

cp .env.example .env


Abra o novo arquivo .env e insira sua chave da API do Google no local indicado:

Você pode obter uma chave de API gratuita no Google AI Studio.

# ...
# IMPORTANTE: Você precisa obter sua própria chave de API do Google AI Studio
# e colá-la aqui.
GOOGLE_API_KEY="COLE_SUA_CHAVE_DE_API_DO_GOOGLE_AQUI"
# ...


Passo 3: Iniciar a Aplicação

Com o Docker rodando, execute o seguinte comando na raiz do projeto:

docker-compose up --build

Este comando irá construir as imagens dos serviços e iniciará todos os contêineres.

O processo pode levar alguns minutos na primeira vez.

Aguarde até que os logs se estabilizem e mostrem que os serviços estão rodando.



🧪 Como Usar a Aplicação

Após a execução do docker-compose up:

Acesse o Frontend:

Abra seu navegador e vá para: http://localhost:8080

Teste a Funcionalidade:

Digite um texto na caixa de texto.

Selecione os idiomas de origem e destino.

Clique no botão "Traduzir".

Observe a área de resultados sendo atualizada com o status e o texto traduzido.



Outros Pontos de Acesso (Opcional)


Interface do RabbitMQ: Para visualizar as filas e mensagens, acesse http://localhost:15672.

Usuário: user

Senha: password



API REST: A API está acessível na porta 3000 para testes diretos com ferramentas como Postman ou curl.


## ⚙️ Testando a API com Postman

Para testar os endpoints da API diretamente, use as seguintes configurações no Postman.

---

### 1. Enviar uma Tradução

Cria uma nova requisição de tradução.

-   **Método:** `POST`
-   **URL:** `http://localhost:3000/translations`

-   **Aba "Body"**:
    -   Selecione **raw** e **JSON**.
    -   Cole o seguinte corpo:
      ```json
      {
        "text": "Simplicity is the ultimate sophistication.",
        "sourceLanguage": "en",
        "targetLanguage": "pt"
      }
      ```
-   **Ação:** Clique em **Send**.

-   **Resultado:** Você receberá uma resposta `202 Accepted`. **Copie o `requestId`** do corpo da resposta para usar no próximo passo.

---

### 2. Consultar o Status da Tradução

Verifica o andamento e o resultado de uma tradução.

-   **Método:** `GET`
-   **URL:** `http://localhost:3000/translations/<SEU_REQUEST_ID>`
    -   *(Substitua `<SEU_REQUEST_ID>` pelo ID que você copiou no passo anterior)*

-   **Aba "Body"**: Nenhuma configuração é necessária.

-   **Ação:** Clique em **Send**.

-   **Resultado:** A resposta mostrará o status atual (`queued`, `processing` ou `completed`). Se o status for `completed`, o corpo da resposta incluirá o `translatedText`.