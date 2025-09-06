const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { Pool } = require("pg");
const amqp = require("amqplib");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS translations (
      requestId UUID PRIMARY KEY,
      text TEXT NOT NULL,
      sourceLanguage VARCHAR(10) NOT NULL,
      targetLanguage VARCHAR(10) NOT NULL,
      translatedText TEXT,
      status VARCHAR(20) NOT NULL,
      createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log("Tabela 'translations' verificada/criada com sucesso.");
  } catch (error) {
    console.error("Erro ao criar a tabela:", error);
    process.exit(1);
  }
};

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME = "translation_queue";

let channel;
async function connectToRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log("Conectado ao RabbitMQ e fila assegurada.");
  } catch (error) {
    console.error("Erro ao conectar ao RabbitMQ:", error);
    setTimeout(connectToRabbitMQ, 5000);
  }
}

app.post("/translations", async (req, res) => {
  const { text, sourceLanguage, targetLanguage } = req.body;

  if (!text || !sourceLanguage || !targetLanguage) {
    return res
      .status(400)
      .json({
        error: "Campos text, sourceLanguage e targetLanguage são obrigatórios.",
      });
  }

  const requestId = uuidv4();
  const status = "queued";

  try {
    const dbQuery = `
      INSERT INTO translations (requestId, text, sourceLanguage, targetLanguage, status)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(dbQuery, [
      requestId,
      text,
      sourceLanguage,
      targetLanguage,
      status,
    ]);

    const message = { requestId, text, sourceLanguage, targetLanguage };
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    res.status(202).json({
      message:
        "Sua requisição de tradução foi recebida e está sendo processada.",
      requestId: requestId,
    });
  } catch (error) {
    console.error("Erro ao criar tradução:", error);
    res.status(500).json({ error: "Falha ao processar a requisição." });
  }
});

app.get("/translations/:requestId", async (req, res) => {
  const { requestId } = req.params;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM translations WHERE requestId = $1",
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Requisição não encontrada." });
    }

    const result = rows[0];
    const response = {
      requestId: result.requestid,
      status: result.status,
      originalText: result.text,
      translatedText: result.translatedtext,
      createdAt: result.createdat,
      updatedAt: result.updatedat,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Erro ao buscar tradução:", error);
    res.status(500).json({ error: "Falha ao buscar o status da requisição." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await createTable();
  await connectToRabbitMQ();
  console.log(`API de Tradução rodando na porta ${PORT}`);
});
