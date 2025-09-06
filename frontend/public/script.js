document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("translation-form");
  const submitButton = form.querySelector('button[type="submit"]');
  const resultsArea = document.getElementById("results-area");
  const statusContainer = document.getElementById("status-container");
  const requestIdSpan = document.getElementById("request-id");
  const statusTextSpan = document.getElementById("status-text");
  const translatedTextDiv = document.getElementById("translated-text");
  const errorMessageP = document.getElementById("error-message");

  const API_URL = "http://localhost:3000/translations";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    hideResults();

    submitButton.classList.add("loading");
    submitButton.disabled = true;

    const text = document.getElementById("text-to-translate").value;
    const sourceLanguage = document.getElementById("source-language").value;
    const targetLanguage = document.getElementById("target-language").value;

    if (!text.trim()) {
      showError("Por favor, digite um texto para traduzir.");
      enableButton();
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
      }

      const data = await response.json();
      const { requestId } = data;

      showStatus(requestId, "Enfileirado...");
      pollStatus(requestId);
    } catch (error) {
      showError(`Não foi possível iniciar a tradução: ${error.message}`);
      enableButton();
    }
  });

  function pollStatus(requestId) {
    let pollingCount = 0;
    const maxPollingAttempts = 30;

    const interval = setInterval(async () => {
      pollingCount++;
      if (pollingCount > maxPollingAttempts) {
        showError(
          "A requisição demorou muito para responder. Tente novamente."
        );
        clearInterval(interval);
        enableButton();
        return;
      }

      try {
        const response = await fetch(`${API_URL}/${requestId}`);

        if (response.status === 404) {
          console.log(
            `Tentativa ${pollingCount}: Requisição ${requestId} ainda não encontrada, tentando novamente...`
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Erro no servidor ao buscar status: ${response.statusText}`
          );
        }

        const data = await response.json();
        updateStatus(data);

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
          enableButton();
        }
      } catch (error) {
        showError(error.message);
        clearInterval(interval);
        enableButton();
      }
    }, 2000);
  }

  function enableButton() {
    submitButton.classList.remove("loading");
    submitButton.disabled = false;
  }

  function showStatus(requestId, initialStatus) {
    statusContainer.classList.remove("hidden");
    requestIdSpan.textContent = requestId;
    statusTextSpan.textContent = initialStatus;
    translatedTextDiv.textContent = "Aguardando resultado...";
  }

  function updateStatus(data) {
    statusTextSpan.textContent = data.status;
    if (data.status === "completed") {
      translatedTextDiv.textContent = data.translatedText;
    }
    if (data.status === "failed") {
      translatedTextDiv.textContent =
        "A tradução falhou. Verifique os logs do worker para mais detalhes.";
      translatedTextDiv.classList.add("error");
    }
  }

  function showError(message) {
    errorMessageP.textContent = message;
    errorMessageP.classList.remove("hidden");
  }

  function hideResults() {
    statusContainer.classList.add("hidden");
    errorMessageP.classList.add("hidden");
    translatedTextDiv.classList.remove("error");
  }
});
