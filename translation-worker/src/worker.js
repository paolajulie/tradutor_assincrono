require("dotenv").config();
const { Pool } = require("pg");
const amqp = require("amqplib");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME = "translation_queue";

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error(
    "ERRO FATAL: A variável de ambiente GOOGLE_API_KEY não foi definida."
  );
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

async function connectWithRetry(url, maxRetries = 10, delay = 5000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(
        `[Worker] Tentativa de conexão ${i + 1}/${maxRetries} ao RabbitMQ...`
      );
      const connection = await amqp.connect(url);
      console.log("[Worker] Conectado ao RabbitMQ com sucesso!");

      connection.on("error", (err) => {
        console.error("[Worker] Erro na conexão RabbitMQ:", err.message);
      });

      connection.on("close", () => {
        console.log(
          "[Worker] Conexão RabbitMQ fechada. Tentando reconectar..."
        );
        setTimeout(() => startWorker(), 5000);
      });

      return connection;
    } catch (error) {
      console.log(
        `[Worker] Falha na conexão (tentativa ${i + 1}): ${error.message}`
      );

      if (i === maxRetries - 1) {
        throw new Error(
          `Não foi possível conectar ao RabbitMQ após ${maxRetries} tentativas`
        );
      }

      console.log(
        `[Worker] Aguardando ${
          delay / 1000
        } segundos antes da próxima tentativa...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function updateTranslationStatus(
  requestId,
  status,
  translatedText = null
) {
  const query = `
    UPDATE translations
    SET status = $1, translatedText = $2, updatedAt = CURRENT_TIMESTAMP
    WHERE requestId = $3
  `;
  await pool.query(query, [status, translatedText, requestId]);
  console.log(
    `[DB] Requisição ${requestId} atualizada para o status: ${status}.`
  );
}

async function performTranslation(text, sourceLanguage, targetLanguage) {
  const languageMap = {
    pt: "Português",
    en: "Inglês",
    es: "Espanhol",
    fr: "Francês",
    de: "Alemão",
  };

  const sourceLangName = languageMap[sourceLanguage] || sourceLanguage;
  const targetLangName = languageMap[targetLanguage] || targetLanguage;

  console.log(
    `[Gemini] Traduzindo de ${sourceLangName} para ${targetLangName}...`
  );

  const prompt = `Traduza o seguinte texto de ${sourceLangName} para ${targetLangName}. Responda APENAS com o texto traduzido, sem nenhuma saudação, explicação, comentário ou formatação adicional.
  
  Texto a ser traduzido: "${text}"`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text().trim();

    if (!translatedText) {
      throw new Error("A API do Gemini retornou uma resposta vazia.");
    }

    console.log(`[Gemini] Tradução concluída: "${translatedText}"`);
    return translatedText;
  } catch (error) {
    console.error("[Gemini] Falha na tradução com a API do Google:", error);
    throw new Error("Falha na chamada à API do Google AI.");
  }
}

async function startWorker() {
  try {
    const connection = await connectWithRetry(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log(
      `[*] Worker aguardando mensagens na fila: ${QUEUE_NAME}. Para sair, pressione CTRL+C`
    );

    channel.consume(
      QUEUE_NAME,
      async (msg) => {
        if (msg === null) return;

        const message = JSON.parse(msg.content.toString());
        const { requestId, text, sourceLanguage, targetLanguage } = message;

        console.log(`[Worker] Recebido job de tradução: ${requestId}`);

        try {
          await updateTranslationStatus(requestId, "processing");
          const translatedText = await performTranslation(
            text,
            sourceLanguage,
            targetLanguage
          );
          await updateTranslationStatus(requestId, "completed", translatedText);
        } catch (error) {
          console.error(
            `[Worker] Erro ao processar ${requestId}:`,
            error.message
          );
          await updateTranslationStatus(requestId, "failed");
        } finally {
          channel.ack(msg);
        }
      },
      {
        noAck: false,
      }
    );
  } catch (error) {
    console.error(
      "[Worker] Não foi possível iniciar. Verifique a conexão com o RabbitMQ.",
      error.message
    );
    console.log("[Worker] Tentando novamente em 10 segundos...");
    setTimeout(() => startWorker(), 10000);
  }
}

process.on("SIGINT", () => {
  console.log("[Worker] Recebido SIGINT. Finalizando worker...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[Worker] Recebido SIGTERM. Finalizando worker...");
  process.exit(0);
});

startWorker();
